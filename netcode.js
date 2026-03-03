"use strict";

// Rollback netcode + (later) WebRTC plumbing.

const NET_PLAYERS = { HOST: "host", JOIN: "join" };

const NET_ROLLBACK_WINDOW = 120; // frames (~2s at 60fps)
// Delay our own input by this many frames so remote input has time to arrive; reduces desync at cost of ~50ms input lag.
const NET_INPUT_DELAY_FRAMES = 3;

let netEnabled = false;
let netRole = null; // "host" | "join"

let netRollbackCount = 0;
let netLastRollbackFromFrame = -1;

let netRoomCode = null;
let netConnectionState = "idle"; // idle | signaling | waiting | connecting | connected | error
let netLastError = null;

let netSignaling = null; // WebSocket
let netPeer = null; // RTCPeerConnection
let netDataChannel = null; // RTCDataChannel

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
// Host-authoritative: host uses latest P2 input received from joiner.
let netLatestRemoteInput = 0;

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
  for (let i = 0; i < netStateHistory.length; i++) netStateHistory[i] = null;

  if (netHostReadyTimeout != null) { clearTimeout(netHostReadyTimeout); netHostReadyTimeout = null; }
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

function netcodeEnqueueRemoteInput(frame, bits) {
  netReceivedInputCount++;
  netIncomingRemoteInputs.push({ frame: frame | 0, bits: bits | 0 });
}

function _setConn(state, err) {
  netConnectionState = state;
  if (err) netLastError = String(err);
}

function _sendDC(obj) {
  if (!netDataChannel || netDataChannel.readyState !== "open") return;
  netDataChannel.send(JSON.stringify(obj));
}

function _handleDCMessage(data) {
  let msg;
  try { msg = JSON.parse(data); } catch (_) { return; }
  if (!msg || typeof msg !== "object") return;

  if (msg.t === "i") {
    netcodeEnqueueRemoteInput(msg.f | 0, msg.b | 0);
    if (netRole === NET_PLAYERS.HOST) netLatestRemoteInput = msg.b | 0;
  } else if (msg.t === "state" && msg.state && netRole === NET_PLAYERS.JOIN) {
    loadState(msg.state);
  } else if (msg.t === "start") {
    if (typeof msg.p1CharacterIndex === "number") p1CharacterIndex = msg.p1CharacterIndex | 0;
    if (typeof msg.p2CharacterIndex === "number") p2CharacterIndex = msg.p2CharacterIndex | 0;
    if (typeof msg.p1ColorIndex === "number") p1ColorIndex = msg.p1ColorIndex | 0;
    if (typeof msg.p2ColorIndex === "number") p2ColorIndex = msg.p2ColorIndex | 0;
    if (typeof msg.stageIndex === "number") stageIndex = msg.stageIndex | 0;

    const role = netRole || NET_PLAYERS.JOIN;
    netcodeEnable(role);
    startVersusMatch();
    if (role === NET_PLAYERS.JOIN) _sendDC({ t: "ready" });
  } else if (msg.t === "ready") {
    if (netRole === NET_PLAYERS.HOST) {
      if (netHostReadyTimeout != null) { clearTimeout(netHostReadyTimeout); netHostReadyTimeout = null; }
      netcodeEnable(NET_PLAYERS.HOST);
      startVersusMatch();
    }
  }
}

let netIceQueue = [];

function _createPeerCommon() {
  netIceQueue = [];
  netPeer = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  });
  netPeer.onicecandidate = (e) => {
    if (!e.candidate) return;
    if (!netRoomCode || !netSignaling || netSignaling.readyState !== WebSocket.OPEN) return;
    netSignaling.send(JSON.stringify({ type: "signal", code: netRoomCode, data: { ice: e.candidate } }));
  };
  netPeer.onconnectionstatechange = () => {
    if (netPeer.connectionState === "connected") _setConn("connected");
    else if (netPeer.connectionState === "failed" || netPeer.connectionState === "disconnected") _setConn("error", "Peer connection failed/disconnected");
  };
}

async function _drainIceQueue() {
  if (!netPeer) return;
  for (const c of netIceQueue) {
    try { await netPeer.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
  }
  netIceQueue = [];
}

function _queueOrAddIce(data) {
  const c = data.ice;
  if (!c) return;
  if (netPeer && netPeer.remoteDescription) {
    netPeer.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
  } else {
    netIceQueue.push(c);
  }
}

function netOnlineHost(signalingUrl) {
  netcodeReset();
  netRole = NET_PLAYERS.HOST;
  _setConn("signaling");
  console.log("[net] Host connecting to", signalingUrl);

  netSignaling = new WebSocket(signalingUrl);
  netSignaling.onopen = () => {
    console.log("[net] Host WebSocket open, sending createRoom");
    netSignaling.send(JSON.stringify({ type: "createRoom" }));
  };
  netSignaling.onmessage = async (ev) => {
    console.log("[net] Host received:", ev.data && ev.data.substring(0, 80));
    let msg;
    try { msg = JSON.parse(ev.data); } catch (_) { return; }
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "roomCreated") {
      netRoomCode = String(msg.code || "").toUpperCase();
      _setConn("waiting");

      _createPeerCommon();
      netDataChannel = netPeer.createDataChannel("inputs", { ordered: false, maxRetransmits: 0 });
      netDataChannel.onopen = () => {
        _setConn("connected");
        _sendDC({ t: "start", p1CharacterIndex, p2CharacterIndex, p1ColorIndex, p2ColorIndex, stageIndex });
        // If "ready" is dropped (unreliable channel), start match after 1.5s so host isn't stuck.
        netHostReadyTimeout = setTimeout(() => {
          if (netHostReadyTimeout == null) return;
          netHostReadyTimeout = null;
          if (!netEnabled && gameState === GAME_STATE.ONLINE_LOBBY) {
            netcodeEnable(NET_PLAYERS.HOST);
            startVersusMatch();
          }
        }, 1500);
      };
      netDataChannel.onmessage = (e) => _handleDCMessage(e.data);

      const offer = await netPeer.createOffer();
      await netPeer.setLocalDescription(offer);
      netSignaling.send(JSON.stringify({ type: "signal", code: netRoomCode, data: { sdp: netPeer.localDescription } }));
    } else if (msg.type === "signal") {
      const data = msg.data || {};
      if (!netPeer) return;
      if (data.sdp) {
        await netPeer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await _drainIceQueue();
      } else if (data.ice) {
        _queueOrAddIce(data);
      }
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

function netOnlineJoin(signalingUrl, code) {
  netcodeReset();
  netRole = NET_PLAYERS.JOIN;
  netRoomCode = String(code || "").trim().toUpperCase();
  _setConn("signaling");

  netSignaling = new WebSocket(signalingUrl);
  netSignaling.onopen = () => {
    netSignaling.send(JSON.stringify({ type: "joinRoom", code: netRoomCode }));
  };
  netSignaling.onmessage = async (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (_) { return; }
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "signal") {
      const data = msg.data || {};
      if (!netPeer) {
        _createPeerCommon();
        netPeer.ondatachannel = (e) => {
          netDataChannel = e.channel;
          netDataChannel.onopen = () => _setConn("connected");
          netDataChannel.onmessage = (ev2) => _handleDCMessage(ev2.data);
        };
      }
      if (data.sdp) {
        await netPeer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await _drainIceQueue();
        const answer = await netPeer.createAnswer();
        await netPeer.setLocalDescription(answer);
        netSignaling.send(JSON.stringify({ type: "signal", code: netRoomCode, data: { sdp: netPeer.localDescription } }));
      } else if (data.ice) {
        _queueOrAddIce(data);
      }
    } else if (msg.type === "error") {
      _setConn("error", msg.message || "Signaling error");
    }
  };
  netSignaling.onerror = () => _setConn("error", "Signaling websocket error");
  netSignaling.onclose = () => {
    if (netConnectionState !== "connected" && !netLastError) _setConn("error", "Connection lost. Check host IP and that the server is running.");
  };
}

function netOnlineDisconnect() {
  netcodeReset();
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
    _sendDC({ t: "state", state: saveState() });
    return;
  }

  // Joiner: only send input; state is received and applied in _handleDCMessage.
  const currentKeys = _localBitsForThisPeer();
  _setInputHistory(f, currentKeys);
  _sendDC({ t: "i", f, b: currentKeys | 0 });
}

function netcodeJoinerSendInput() {
  if (!netEnabled || netRole !== NET_PLAYERS.JOIN || gameState !== GAME_STATE.VERSUS) return;
  _sendDC({ t: "i", f: simFrame, b: _localBitsForThisPeer() | 0 });
}

