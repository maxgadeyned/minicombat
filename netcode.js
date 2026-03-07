"use strict";

// Netcode: host-authoritative with optional rollback plumbing.

const NET_PLAYERS = { HOST: "host", JOIN: "join" };

const NET_ROLLBACK_WINDOW = 120; // frames (~2s at 60fps) – used only in offline determinism tools.
// In host-authoritative mode we do not delay local input; keep constant for legacy code paths.
const NET_INPUT_DELAY_FRAMES = 0;
// To avoid flooding slower connections, host only sends a state snapshot every N sim frames.
const NET_STATE_SEND_INTERVAL_FRAMES = 1; // 60 / 3 = ~20Hz state updates

let netEnabled = false;
let netRole = null; // "host" | "join"

let netRollbackCount = 0;
let netLastRollbackFromFrame = -1;

let netRoomCode = null;
let netConnectionState = "idle"; // idle | signaling | waiting | connecting | connected | error
let netLastError = null;

let netSignaling = null; // WebSocket connection to game server
let netPeer = null; // RTCPeerConnection (unused in server-authoritative mode)
let netDataChannel = null; // RTCDataChannel (unused; kept for compatibility)

// Lobby metadata (names, character selections, stage) – synced explicitly via data channel.
let netLocalName = "";
let netRemoteName = "";
let netLocalCharIndex = null;
let netRemoteCharIndex = null;
// Queue for character selection from keydown (consumed in draw) so selection works even if gameState/keys differ across scripts.
let netLobbyCharQueue = [];
let netSelectedStageIndex = 0;
let netStageIsRandom = false;

// Frame-indexed input histories (bitmasks; see `INPUT_BITS` in `game.js`).
const netLocalInput = new Map();  // frame -> bits
const netRemoteInput = new Map(); // frame -> bits
const netRemotePredictedUsed = new Map(); // frame -> bits actually used in sim

// Snapshot history: state at *start* of frame.
const netStateHistory = new Array(NET_ROLLBACK_WINDOW);

// Queue of remote inputs received asynchronously.
const netIncomingRemoteInputs = [];

let netReceivedInputCount = 0;
let netHostReadyTimeout = null;
/** Real-time timer so host sends versusGo at fixed 6.22s (avoids slow frame rate = 8s delay). */
let netHostVersusGoTimer = null;
// Host-authoritative: host uses latest P2 input received from joiner.
let netLatestRemoteInput = 0;

const NET_STATE_BUFFER_MAX = 10;
let netStateBuffer = [];

function netcodeReset() {
  netEnabled = false;
  netRole = null;
  netRollbackCount = 0;
  netLastRollbackFromFrame = -1;
  netRoomCode = null;
  netConnectionState = "idle";
  netLastError = null;
  netLocalInput.clear();
  netRemoteInput.clear();
  netRemotePredictedUsed.clear();
  netIncomingRemoteInputs.length = 0;
  netReceivedInputCount = 0;
  netLatestRemoteInput = 0;
  netLocalName = "";
  netRemoteName = "";
  netLocalCharIndex = null;
  netRemoteCharIndex = null;
  netLobbyCharQueue = [];
  netSelectedStageIndex = 0;
  netStageIsRandom = false;
  for (let i = 0; i < netStateHistory.length; i++) netStateHistory[i] = null;

  netStateBuffer = [];
  if (netHostReadyTimeout != null) { clearTimeout(netHostReadyTimeout); netHostReadyTimeout = null; }
  if (netHostVersusGoTimer != null) { clearTimeout(netHostVersusGoTimer); netHostVersusGoTimer = null; }
  try { if (netDataChannel) netDataChannel.close(); } catch (_) {}
  try { if (netPeer) netPeer.close(); } catch (_) {}
  try { if (netSignaling) netSignaling.close(); } catch (_) {}
  netDataChannel = null;
  netPeer = null;
  netSignaling = null;
}

function netcodeEnable(role) {
  netEnabled = true;
  netRole = role;
  netRollbackCount = 0;
  netLastRollbackFromFrame = -1;
  netReceivedInputCount = 0;
  netLatestRemoteInput = 0;
  netLocalInput.clear();
  netRemoteInput.clear();
  netRemotePredictedUsed.clear();
  netIncomingRemoteInputs.length = 0;
  for (let i = 0; i < netStateHistory.length; i++) netStateHistory[i] = null;

  // Initialize lobby metadata defaults based on role if not already set.
  if (!netLocalName) netLocalName = role === NET_PLAYERS.HOST ? "Host" : "Guest";
  if (!netRemoteName) netRemoteName = role === NET_PLAYERS.HOST ? "Joiner" : "Host";
  if (netLocalCharIndex == null) netLocalCharIndex = 0;
  if (!Number.isInteger(netSelectedStageIndex)) netSelectedStageIndex = (typeof stageIndex === "number" ? (stageIndex | 0) : 0);
}

function netcodeIsEnabled() { return netEnabled; }
function netcodeGetStats() {
  return {
    enabled: netEnabled,
    role: netRole,
    roomCode: netRoomCode,
    connectionState: netConnectionState,
    lastError: netLastError,
    rollbackCount: netRollbackCount,
    lastRemoteFrame: netRemoteInput.size ? Math.max(...netRemoteInput.keys()) : -1,
    receivedInputCount: netReceivedInputCount,
  };
}

function netcodeGetLobbyState() {
  return {
    role: netRole,
    localName: netLocalName,
    remoteName: netRemoteName,
    localCharIndex: netLocalCharIndex,
    remoteCharIndex: netRemoteCharIndex,
    stageIndex: netSelectedStageIndex,
    stageIsRandom: !!netStageIsRandom,
  };
}

function netcodeEnqueueRemoteInput(frame, bits) {
  netReceivedInputCount++;
  netIncomingRemoteInputs.push({ frame: frame | 0, bits: bits | 0 });
}

function _setConn(state, err) {
  netConnectionState = state;
  if (err) netLastError = String(err);
}

function _sendDC(obj) {
  // In server-authoritative mode, tunnel all game messages via the signaling WebSocket.
  if (!netSignaling || netSignaling.readyState !== WebSocket.OPEN || !netRoomCode) return;
  netSignaling.send(JSON.stringify({ type: "game", code: netRoomCode, data: obj }));
}

function _handleDCMessage(msg) {
  // Accept either a parsed object or a JSON string (for legacy paths).
  if (typeof msg === "string") {
    try { msg = JSON.parse(msg); } catch (_) { return; }
  }
  if (!msg || typeof msg !== "object") return;

  if (msg.t === "i") {
    netcodeEnqueueRemoteInput(msg.f | 0, msg.b | 0);
    if (netRole === NET_PLAYERS.HOST) netLatestRemoteInput = msg.b | 0;
  } else if (msg.t === "state" && msg.state) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    netStateBuffer.push({ state: msg.state, receivedAt: now });
    while (netStateBuffer.length > NET_STATE_BUFFER_MAX) netStateBuffer.shift();
  } else if (msg.t === "name") {
    if (typeof msg.name === "string") netRemoteName = msg.name.slice(0, 16);
  } else if (msg.t === "char") {
    if (typeof msg.idx === "number") netRemoteCharIndex = msg.idx | 0;
  } else if (msg.t === "stage") {
    if (typeof msg.idx === "number") netSelectedStageIndex = msg.idx | 0;
    netStageIsRandom = !!msg.rand;
  } else if (msg.t === "start") {
    if (typeof msg.p1CharacterIndex === "number") p1CharacterIndex = msg.p1CharacterIndex | 0;
    if (typeof msg.p2CharacterIndex === "number") p2CharacterIndex = msg.p2CharacterIndex | 0;
    if (typeof msg.p1ColorIndex === "number") p1ColorIndex = msg.p1ColorIndex | 0;
    if (typeof msg.p2ColorIndex === "number") p2ColorIndex = msg.p2ColorIndex | 0;
    if (typeof msg.stageIndex === "number") {
      stageIndex = msg.stageIndex | 0;
      netSelectedStageIndex = stageIndex;
      netStageIsRandom = !!msg.stageIsRandom;
    }
    // Canonical display names for VS screen / winner banner: P1 = host, P2 = joiner.
    if (typeof p1DisplayName !== "undefined") {
      p1DisplayName = (typeof msg.p1Name === "string" && msg.p1Name.trim()) ? msg.p1Name.trim().slice(0, 16) : "Player 1";
      p2DisplayName = (typeof msg.p2Name === "string" && msg.p2Name.trim()) ? msg.p2Name.trim().slice(0, 16) : "Player 2";
    }

    const role = netRole || NET_PLAYERS.JOIN;
    netcodeEnable(role);
    // Joiner: ack so host knows we're ready; then wait for beginIntro so both start the intro in sync.
    if (role === NET_PLAYERS.JOIN) {
      _sendDC({ t: "startAck" });
      // goToVersusIntro() will be called when we receive "beginIntro"
    } else {
      if (typeof goToVersusIntro === "function") goToVersusIntro();
    }
  } else if (msg.t === "startAck") {
    // Host: joiner is ready; start intro and tell joiner to start. Use real-time timer for versusGo
    // so host sends GO at fixed 6.22s regardless of frame rate (fixes 8s delay on slow/throttled hosts).
    if (netRole === NET_PLAYERS.HOST) {
      _sendDC({ t: "beginIntro" });
      if (typeof goToVersusIntro === "function") goToVersusIntro();
      if (netHostVersusGoTimer != null) clearTimeout(netHostVersusGoTimer);
      const INTRO_MS = 3000;
      const TRANSITION_ANIM_MS = 220;
      const COUNTDOWN_MS = 3000;
      netHostVersusGoTimer = setTimeout(() => {
        netHostVersusGoTimer = null;
        if (netRole !== NET_PLAYERS.HOST) return;
        if (typeof gameState === "undefined" || typeof GAME_STATE === "undefined") return;
        if (gameState === GAME_STATE.VERSUS_INTRO && typeof goToTransition === "function") goToTransition();
        if (gameState === GAME_STATE.TRANSITION || gameState === GAME_STATE.VERSUS_INTRO) {
          gameState = GAME_STATE.VERSUS;
          const state = typeof saveState === "function" ? saveState() : null;
          _sendDC({ t: "versusGo", state });
        }
      }, INTRO_MS + TRANSITION_ANIM_MS + COUNTDOWN_MS);
    }
  } else if (msg.t === "beginIntro") {
    // Joiner: host has started intro; start ours so we're in sync.
    if (netRole === NET_PLAYERS.JOIN && typeof goToVersusIntro === "function") goToVersusIntro();
  } else if (msg.t === "versusGo") {
    // Joiner: server says match started; enter VERSUS and apply initial state if provided.
    if (netRole === NET_PLAYERS.JOIN) {
      if (gameState === GAME_STATE.VERSUS_INTRO && typeof goToTransition === "function") goToTransition();
      if (msg.state) {
        if (typeof loadState === "function") loadState(msg.state);
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        netStateBuffer.push({ state: msg.state, receivedAt: now });
      }
      gameState = GAME_STATE.VERSUS;
    }
  } else if (msg.t === "serverTick") {
    // Temporary debug: log server-driven frame number.
    console.log("[net] serverTick frame:", msg.f);
  }
}

function _lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function _lerpFighter(out, a, b, t) {
  if (!out || !a || !b) return;
  out.pos.x = _lerp(a.pos.x, b.pos.x, t);
  out.pos.y = _lerp(a.pos.y, b.pos.y, t);
  out.prevPos.x = _lerp(a.prevPos.x, b.prevPos.x, t);
  out.prevPos.y = _lerp(a.prevPos.y, b.prevPos.y, t);
  out.vel.x = _lerp(a.vel.x, b.vel.x, t);
  out.vel.y = _lerp(a.vel.y, b.vel.y, t);
}

function _copyFighter(target, src) {
  if (!target || !src) return;
  target.pos.x = src.pos.x; target.pos.y = src.pos.y;
  target.prevPos.x = src.prevPos.x; target.prevPos.y = src.prevPos.y;
  target.vel.x = src.vel.x; target.vel.y = src.vel.y;
  target.damage = src.damage; target.onGround = src.onGround; target.facing = src.facing;
  target.jumpsRemaining = src.jumpsRemaining; target.blocking = src.blocking;
  target.respawnAt = src.respawnAt; target.invulnUntil = src.invulnUntil;
  target.stunnedUntil = src.stunnedUntil; target.parryWindowUntil = src.parryWindowUntil;
  target.parryLockoutUntil = src.parryLockoutUntil; target.rollingUntil = src.rollingUntil;
  target.rollInvulnUntil = src.rollInvulnUntil; target.nextLightAt = src.nextLightAt;
  target.nextHeavyAt = src.nextHeavyAt; target.nextSpecialAt = src.nextSpecialAt;
}

/** Apply server state for opponent + combat only. Never overwrites our character - pure local sim. */
function netcodeApplyServerStateForOpponentAndCombat() {
  if (netStateBuffer.length === 0) return;
  const s = netStateBuffer[netStateBuffer.length - 1].state;
  if (!s) return;
  const opp = netRole === NET_PLAYERS.HOST ? s.player2 : s.player;
  if (opp) _copyFighter(netRole === NET_PLAYERS.HOST ? player2 : player, opp);
  playerStocks = s.playerStocks ?? playerStocks;
  player2Stocks = s.player2Stocks ?? player2Stocks;
  roundOver = s.roundOver ?? roundOver;
  roundOverSelection = s.roundOverSelection ?? roundOverSelection;
  roundOverStartTime = s.roundOverStartTime ?? roundOverStartTime;
  roundOverWinner = s.roundOverWinner ?? roundOverWinner;
  if (s.player) player.damage = s.player.damage;
  if (s.player2) player2.damage = s.player2.damage;
  koSlowmoUntil = s.koSlowmoUntil ?? koSlowmoUntil;
  koFlashUntil = s.koFlashUntil ?? koFlashUntil;
  hitstopUntil = s.hitstopUntil ?? hitstopUntil;
  shakeUntil = s.shakeUntil ?? shakeUntil;
  shakeMagnitude = s.shakeMagnitude ?? shakeMagnitude;
  const serverNow = (s.simFrame || 0) * (typeof SIM_FRAME_MS !== "undefined" ? SIM_FRAME_MS : 1000 / 60);
  hitEffects.length = 0;
  for (const e of s.hitEffects || []) {
    const age = serverNow - (e.createdAt || 0);
    if (age <= (e.duration || 9999)) hitEffects.push({ ...e });
  }
}

function netcodeHasServerState() { return netStateBuffer.length > 0; }

/** Returns latest server state for initial load. */
function netcodeGetInterpolatedState(now) {
  if (netStateBuffer.length === 0) return null;
  return netStateBuffer[netStateBuffer.length - 1].state;
}

let netIceQueue = [];

function _createPeerCommon() {}
async function _drainIceQueue() {}
function _queueOrAddIce() {}

function netOnlineHost(signalingUrl, displayName) {
  netcodeReset();
  netRole = NET_PLAYERS.HOST;
  if (typeof displayName === "string" && displayName.trim()) netLocalName = displayName.trim().slice(0, 16);
  _setConn("signaling");
  console.log("[net] Host connecting to", signalingUrl);

  netSignaling = new WebSocket(signalingUrl);
  netSignaling.onopen = () => {
    console.log("[net] Host WebSocket open, sending createRoom");
    netSignaling.send(JSON.stringify({ type: "createRoom" }));
  };
  netSignaling.onmessage = async (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (_) { return; }
    if (!msg || typeof msg !== "object") return;
    console.log("[net] Host received message type:", msg.type, "code:", msg.code);

    if (msg.type === "roomCreated") {
      netRoomCode = String(msg.code || "").toUpperCase();
      _setConn("waiting");
      console.log("[net] Host received roomCreated, code:", netRoomCode);
    } else if (msg.type === "peerJoined") {
      // Joiner connected; we can now treat the room as ready for game messages.
      _setConn("connected");
      if (netLocalName) _sendDC({ t: "name", name: netLocalName });
      if (netLocalCharIndex != null) _sendDC({ t: "char", idx: netLocalCharIndex | 0 });
    } else if (msg.type === "game") {
      _handleDCMessage(msg.data);
    } else if (msg.type === "error") {
      _setConn("error", msg.message || "Signaling error");
    }
  };
  netSignaling.onerror = () => {
    console.log("[net] Host WebSocket error");
    _setConn("error", "Signaling websocket error");
  };
  netSignaling.onclose = () => {
    console.log("[net] Host WebSocket closed, state was", netConnectionState);
    if (netConnectionState !== "connected" && !netLastError) _setConn("error", "Signaling disconnected");
  };
}

function netOnlineJoin(signalingUrl, code, displayName) {
  netcodeReset();
  netRole = NET_PLAYERS.JOIN;
  if (typeof displayName === "string" && displayName.trim()) netLocalName = displayName.trim().slice(0, 16);
  netRoomCode = String(code || "").trim().toUpperCase();
  _setConn("signaling");

  console.log("[net] Joiner connecting to", signalingUrl, "room", netRoomCode);
  netSignaling = new WebSocket(signalingUrl);
  netSignaling.onopen = () => {
    netSignaling.send(JSON.stringify({ type: "joinRoom", code: netRoomCode }));
  };
  netSignaling.onmessage = async (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (_) { return; }
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "joined") {
      _setConn("connected");
      if (netLocalName) _sendDC({ t: "name", name: netLocalName });
      if (netLocalCharIndex != null) _sendDC({ t: "char", idx: netLocalCharIndex | 0 });
    } else if (msg.type === "game") {
      _handleDCMessage(msg.data);
    } else if (msg.type === "error") {
      _setConn("error", msg.message || "Signaling error");
    }
  };
  netSignaling.onerror = () => {
    console.warn("[net] Joiner WebSocket error – check URL is ws://HOST_IP:8787 and host's server is running.");
    _setConn("error", "Signaling websocket error");
  };
  netSignaling.onclose = (ev) => {
    if (netConnectionState !== "connected" && !netLastError) {
      console.warn("[net] Joiner connection closed. code:", ev.code, "reason:", ev.reason || "(none)");
      _setConn("error", "Connection lost. Check host IP and that the server is running.");
    }
  };
}

function netOnlineDisconnect() {
  netcodeReset();
}

function netcodeSetLocalName(name) {
  const trimmed = String(name || "").trim().slice(0, 16);
  if (!trimmed) return;
  netLocalName = trimmed;
  _sendDC({ t: "name", name: netLocalName });
}

function netcodeSetLocalCharIndex(idx) {
  if (idx == null) return;
  const list = (typeof window !== "undefined" && window.PLAYER_TYPES) ? window.PLAYER_TYPES : [];
  const total = Array.isArray(list) ? list.length : 6;
  const clamped = Math.max(0, Math.min(total - 1, idx | 0));
  if (clamped === netLocalCharIndex) return; // only send when changed
  netLocalCharIndex = clamped;
  _sendDC({ t: "char", idx: clamped });
}

/** Push a character index from keydown; consumed in drawOnlineLobby so selection works regardless of focus/scope. */
function netcodePushLobbyCharSelection(idx) {
  if (idx == null || (idx | 0) !== idx || idx < 0 || idx > 5) return;
  netLobbyCharQueue.push(idx);
}

/** Consume next pending lobby character selection. Returns true if one was applied. Call from drawOnlineLobby to drain queue. */
function netcodeConsumeLobbyCharSelection() {
  if (netLobbyCharQueue.length === 0) return false;
  const idx = netLobbyCharQueue.shift();
  netcodeSetLocalCharIndex(idx);
  return true;
}

// Capture-phase keydown: when in online lobby, push 1–6 to queue so selection works regardless of focus/scope.
if (typeof document !== "undefined") {
  const CHAR_CODE_TO_IDX = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5 };
  document.addEventListener("keydown", (e) => {
    const idx = CHAR_CODE_TO_IDX[e.code];
    if (idx === undefined || e.repeat || typeof netcodePushLobbyCharSelection !== "function") return;
    const gs = typeof window !== "undefined" && typeof window.getGameState === "function" ? window.getGameState() : undefined;
    const ONLINE_LOBBY = typeof window !== "undefined" && window.GAME_STATE ? window.GAME_STATE.ONLINE_LOBBY : "online_lobby";
    if (gs === ONLINE_LOBBY) {
      netcodePushLobbyCharSelection(idx);
      e.preventDefault();
    }
  }, true);
}

function netcodeHostAdjustStage(delta) {
  if (netRole !== NET_PLAYERS.HOST) return;
  const total = (typeof window !== "undefined" && window.STAGE_NAMES && Array.isArray(window.STAGE_NAMES)) ? window.STAGE_NAMES.length : 3;
  const base = Number.isInteger(netSelectedStageIndex) ? netSelectedStageIndex : (stageIndex | 0) || 0;
  let next = (base + delta + total) % total;
  netSelectedStageIndex = next;
  netStageIsRandom = false;
  _sendDC({ t: "stage", idx: netSelectedStageIndex, rand: false });
}

function netcodeHostSetRandomStage() {
  if (netRole !== NET_PLAYERS.HOST) return;
  const total = (typeof window !== "undefined" && window.STAGE_NAMES && Array.isArray(window.STAGE_NAMES)) ? window.STAGE_NAMES.length : 3;
  const next = Math.floor(Math.random() * total) | 0;
  netSelectedStageIndex = next;
  netStageIsRandom = true;
  _sendDC({ t: "stage", idx: netSelectedStageIndex, rand: true });
}

function netOnlineHostCanStart() {
  if (netRole !== NET_PLAYERS.HOST || netConnectionState !== "connected") return false;
  if (netLocalCharIndex == null || netRemoteCharIndex == null) return false;
  const total = (typeof window !== "undefined" && window.STAGE_NAMES && Array.isArray(window.STAGE_NAMES)) ? window.STAGE_NAMES.length : 3;
  if (!Number.isInteger(netSelectedStageIndex) || netSelectedStageIndex < 0 || netSelectedStageIndex >= total) return false;
  return true;
}

function netOnlineHostStartMatch() {
  if (!netOnlineHostCanStart()) return;
  // Finalize stage (respect random flag but pick concrete index now).
  const total = (typeof window !== "undefined" && window.STAGE_NAMES && Array.isArray(window.STAGE_NAMES)) ? window.STAGE_NAMES.length : 3;
  if (netStageIsRandom) {
    netSelectedStageIndex = Math.floor(Math.random() * total) | 0;
    netStageIsRandom = false;
  }
  stageIndex = netSelectedStageIndex;

  // Map lobby selections into global character indices.
  p1CharacterIndex = netRole === NET_PLAYERS.HOST ? (netLocalCharIndex | 0) : (netRemoteCharIndex | 0);
  p2CharacterIndex = netRole === NET_PLAYERS.HOST ? (netRemoteCharIndex | 0) : (netLocalCharIndex | 0);

  // Ensure distinct, readable colors for online (host blue, joiner red).
  if (typeof COLOR_PALETTE !== "undefined" && Array.isArray(COLOR_PALETTE)) {
    const blueIdx = Math.max(0, COLOR_PALETTE.indexOf("#3da1ff"));
    const redIdx = COLOR_PALETTE.indexOf("#ff6b6b") >= 0 ? COLOR_PALETTE.indexOf("#ff6b6b") : ((blueIdx + 7) % COLOR_PALETTE.length);
    p1ColorIndex = blueIdx;
    p2ColorIndex = redIdx === blueIdx ? ((redIdx + 1) % COLOR_PALETTE.length) : redIdx;
  }

  // Set display names for VS screen / winner banner (host = P1, joiner = P2).
  if (typeof p1DisplayName !== "undefined") {
    p1DisplayName = netLocalName || "Player 1";
    p2DisplayName = netRemoteName || "Player 2";
  }

  const payload = {
    t: "start",
    p1CharacterIndex,
    p2CharacterIndex,
    p1ColorIndex,
    p2ColorIndex,
    stageIndex,
    p1Name: netLocalName,
    p2Name: netRemoteName,
    stageIsRandom: false,
  };
  _sendDC(payload);

  netcodeEnable(NET_PLAYERS.HOST);
  // Don't start intro yet – wait for joiner's startAck so both start the VS intro in sync.
}

function netcodeOnHostEnteredVersus() {
  if (netRole !== NET_PLAYERS.HOST) return;
  _sendDC({ t: "versusGo" });
}

function _localBitsForThisPeer() {
  // Online will use "solo" binds for whichever fighter the peer controls.
  return _bitsFromKeysForP1("solo");
}

function _setInputHistory(frame, localBits, remoteBitsMaybe) {
  netLocalInput.set(frame, localBits | 0);
  if (remoteBitsMaybe != null) netRemoteInput.set(frame, remoteBitsMaybe | 0);
}

function _getRemoteBitsWithPrediction(frame) {
  if (netRemoteInput.has(frame)) return netRemoteInput.get(frame) | 0;
  // Predict: repeat last known remote input.
  for (let f = frame - 1; f >= frame - NET_ROLLBACK_WINDOW; f--) {
    if (netRemoteInput.has(f)) return netRemoteInput.get(f) | 0;
  }
  return 0;
}

function _applyIncomingRemoteInputsAndRollbackIfNeeded(currentFrame) {
  if (!netIncomingRemoteInputs.length) return;

  let earliestMismatch = null;
  while (netIncomingRemoteInputs.length) {
    const msg = netIncomingRemoteInputs.shift();
    const f = msg.frame | 0;
    const bits = msg.bits | 0;
    if (f < 0) continue;
    if (f >= currentFrame) {
      // Future input: store it, but no rollback yet.
      netRemoteInput.set(f, bits);
      continue;
    }

    // Past input: store and potentially rollback.
    const prev = netRemoteInput.get(f);
    netRemoteInput.set(f, bits);

    // If we already had the same bits, skip.
    if (prev != null && (prev | 0) === bits) continue;

    // If what we simulated matches the newly arrived input, skip rollback.
    const predictedUsed = netRemotePredictedUsed.get(f);
    if (predictedUsed != null && (predictedUsed | 0) === bits) continue;

    // If the frame is outside our history window, we can't rollback.
    if (currentFrame - f > NET_ROLLBACK_WINDOW - 2) continue;

    // We conservatively rollback from the earliest updated past frame.
    if (earliestMismatch == null || f < earliestMismatch) earliestMismatch = f;
  }

  if (earliestMismatch != null) {
    netRollbackFromFrame(earliestMismatch, currentFrame);
  }
}

function netRollbackFromFrame(fromFrame, toFrameExclusive) {
  const currentFrame = toFrameExclusive | 0;
  const start = fromFrame | 0;
  if (start < 0 || start >= currentFrame) return;

  const snapshot = netStateHistory[start % NET_ROLLBACK_WINDOW];
  if (!snapshot) return;

  loadState(snapshot);
  simFrame = start;

  // Re-simulate deterministically from `start` to `currentFrame - 1`.
  for (let f = start; f < currentFrame; f++) {
    // Refresh snapshot at the start of each frame.
    netStateHistory[f % NET_ROLLBACK_WINDOW] = saveState();

    const rawLocal = netLocalInput.get(f) | 0;
    const localBits = (NET_INPUT_DELAY_FRAMES > 0 && f >= NET_INPUT_DELAY_FRAMES && netLocalInput.has(f - NET_INPUT_DELAY_FRAMES))
      ? netLocalInput.get(f - NET_INPUT_DELAY_FRAMES) | 0
      : rawLocal;
    const remoteBits = _getRemoteBitsWithPrediction(f) | 0;
    netRemotePredictedUsed.set(f, remoteBits | 0);

    let p1Bits, p2Bits;
    if (netRole === NET_PLAYERS.HOST) { p1Bits = localBits; p2Bits = remoteBits; }
    else { p1Bits = remoteBits; p2Bits = localBits; }

    const now = f * SIM_FRAME_MS;
    let dtScaled = SIM_DT;
    if (now < koSlowmoUntil) dtScaled *= KO_SLOWMO_SCALE;
    stepGameplay(dtScaled, now, p1Bits, p2Bits);

    simFrame = f + 1;
  }

  // Restore the global frame counter to the current frame.
  simFrame = currentFrame;

  netRollbackCount += 1;
  netLastRollbackFromFrame = start;
}

function netcodeStepOneFrame(frame) {
  if (!netEnabled) return;
  if (gameState !== GAME_STATE.VERSUS) return;
  if (roundOver || gamePaused) return;

  const f = frame | 0;

  // Host-authoritative (HaxBall-style): only the host runs the sim and sends state.
  if (netRole === NET_PLAYERS.HOST) {
    const localBits = _localBitsForThisPeer();
    const remoteBits = netLatestRemoteInput | 0;
    _setInputHistory(f, localBits);
    const now = f * SIM_FRAME_MS;
    let dtScaled = SIM_DT;
    if (now < koSlowmoUntil) dtScaled *= KO_SLOWMO_SCALE;
    stepGameplay(dtScaled, now, localBits, remoteBits);
    // Send state at a reduced rate to keep bandwidth reasonable on slower links.
    if ((f % NET_STATE_SEND_INTERVAL_FRAMES) === 0) {
      _sendDC({ t: "state", state: saveState() });
    }
    return;
  }

  // Joiner: only send input; state is received and applied in _handleDCMessage.
  const currentKeys = _localBitsForThisPeer();
  _setInputHistory(f, currentKeys);
  _sendDC({ t: "i", f, b: currentKeys | 0 });
}

function netcodeJoinerSendInput() {
  if (!netEnabled || gameState !== GAME_STATE.VERSUS) return;
  netcodeSendInput();
}

/** Serialize our fighter for server sync (used when we've respawned and may be ahead of server). */
function _serializeOurFighter() {
  const f = netRole === NET_PLAYERS.HOST ? (typeof player !== "undefined" ? player : null) : (typeof player2 !== "undefined" ? player2 : null);
  if (!f) return null;
  const simNow = typeof simNowMs === "function" ? simNowMs() : 0;
  // Only send when we've respawned (respawnAt cleared) and we're in/just past invuln - server may be behind
  if (f.respawnAt) return null;
  if (!f.invulnUntil || simNow > f.invulnUntil + 1500) return null;
  return {
    pos: { x: f.pos.x, y: f.pos.y },
    prevPos: { x: f.prevPos.x, y: f.prevPos.y },
    vel: { x: f.vel.x, y: f.vel.y },
    facing: f.facing,
    onGround: f.onGround,
    respawnAt: f.respawnAt || 0,
    invulnUntil: f.invulnUntil || 0,
  };
}

/** Server-authoritative: both host and joiner send input every frame; state comes from server. */
function netcodeSendInput() {
  if (!netEnabled || netRole == null || gameState !== GAME_STATE.VERSUS) return;
  const payload = { t: "i", f: typeof simFrame !== "undefined" ? simFrame : 0, b: _localBitsForThisPeer() | 0 };
  const fighter = _serializeOurFighter();
  if (fighter) payload.fighter = fighter;
  _sendDC(payload);
}

