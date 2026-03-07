"use strict";

const GAME_STATE = {
  TITLE: "title",
  MENU: "menu",
  ONLINE_MENU: "online_menu",
  ONLINE_LOBBY: "online_lobby",
  ONLINE_HOST: "online_host",
  ONLINE_JOIN: "online_join",
  PRACTICE: "practice",
  VERSUS_SELECT: "versus_select",
  VERSUS_INTRO: "versus_intro",
  TRANSITION: "transition",
  VERSUS: "versus",
  P1_SETTINGS: "p1_settings",
  P2_SETTINGS: "p2_settings",
  SETTINGS: "settings",
  CREDITS: "credits"
};
let gameState = GAME_STATE.TITLE;

// ---------- SIM CLOCK (fixed step for determinism / rollback) ----------
const SIM_FPS = 60;
const SIM_DT = 1 / SIM_FPS;
const SIM_FRAME_MS = 1000 / SIM_FPS;
let simFrame = 0;
function simNowMs() { return simFrame * SIM_FRAME_MS; }
function resetSimClock() { simFrame = 0; }
let screenEnterTime = 0;
let transitionActive = false;
let transitionPhase = "out";
let transitionProgress = 0;
let transitionNextState = null;
let transitionPhaseStartTime = 0;
const SCREEN_TRANSITION_DURATION_MS = 220;

function startTransition(nextState) {
  if (transitionActive) return;
  transitionActive = true;
  transitionPhase = "out";
  transitionProgress = 0;
  transitionNextState = nextState;
  transitionPhaseStartTime = performance.now();
}

function updateScreenTransition(now) {
  if (!transitionActive) return;
  transitionProgress = Math.min(1, (now - transitionPhaseStartTime) / SCREEN_TRANSITION_DURATION_MS);
  if (transitionPhase === "out" && transitionProgress >= 1) {
    transitionProgress = 0;
    transitionPhase = "in";
    transitionPhaseStartTime = now;
    gameState = transitionNextState;
    screenEnterTime = now;
    if (transitionNextState === GAME_STATE.TRANSITION) {
      transitionStartTime = now;
      spawnVersusFighters();
    }
  } else if (transitionPhase === "in" && transitionProgress >= 1) {
    transitionActive = false;
    transitionNextState = null;
  }
}

function getTransitionOverlayAlpha() {
  if (!transitionActive) return 0;
  return transitionPhase === "out" ? transitionProgress : 1 - transitionProgress;
}

let menuSelection = 0;
let onlineMenuSelection = 0;
/** WebSocket server URL for online play. When game is served from same host (e.g. Railway), uses wss:// automatically. Override via ?server=wss://... */
const DEFAULT_SERVER_URL = "ws://localhost:8787";
function getServerUrl() {
  if (typeof URLSearchParams !== "undefined") {
    const p = new URLSearchParams(location.search);
    const s = p.get("server");
    if (s && (s.startsWith("ws://") || s.startsWith("wss://"))) return s;
  }
  if (typeof location !== "undefined" && location.hostname && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    return protocol + "//" + location.host;
  }
  return DEFAULT_SERVER_URL;
}
let settingsSelection = 0;
let p2SettingsSelection = 0;
let p2SettingsFromSettings = false;
let p2RebindingAction = null;
const P2_SETTINGS_ACTIONS = ["moveLeft", "moveRight", "jump", "fastFall", "dash", "special", "heavy", "block"];
const P2_SETTINGS_LABELS = ["Move Left", "Move Right", "Jump", "Fast Fall", "Dash", "Special", "Heavy", "Block"];

let p1SettingsMode = "profile";
let p1SettingsProfile = "solo";
let p1SettingsSelection = 0;
let p1RebindingAction = null;
let p1SettingsFromSettings = true;
let p1RebindConflict = null;
let p2RebindConflict = null;
const P1_SETTINGS_ACTIONS = ["moveLeft", "moveRight", "jump", "fastFall", "dash", "special", "heavy", "block"];
const P1_SETTINGS_LABELS = ["Move Left", "Move Right", "Jump", "Fast Fall", "Dash", "Special", "Heavy", "Block"];
const P1_PROFILE_OPTIONS = [{ label: "Playing alone", profile: "solo" }, { label: "Local 2P (same keyboard)", profile: "local" }];
let p1CharacterIndex = 0, p2CharacterIndex = 0;
let p1ColorIndex = 0, p2ColorIndex = 0;
// Display names shown in VS screen / winner banner.
let p1DisplayName = "Player 1";
let p2DisplayName = "Player 2";
// Online host/join form state.
let onlineHostName = "";
let onlineHostSelection = 0; // 0 = name, 1 = connect, 2 = back
let onlineJoinName = "";
let onlineJoinCode = "";
let onlineJoinSelection = 0; // 0 = name, 1 = code, 2 = connect, 3 = back
let stageIndex = 0;
const STAGE_NAMES = ["Arena", "Sunset", "Night"];
let transitionStartTime = 0;
// Match start countdown duration – align with GO so control begins immediately after.
const TRANSITION_DURATION_MS = 3000;

let playerStocks = MAX_STOCKS, dummyStocks = MAX_STOCKS, player2Stocks = MAX_STOCKS, roundOver = false;
let roundOverSelection = 0;
let roundOverStartTime = 0;
let roundOverWinner = null;
let gamePaused = false;
let pauseMenuSelection = 0;
let netDebugOverlay = false;
let determinismTestMessage = null;
let determinismTestMessageUntil = 0;
let bestComboCount = 0, bestComboDamage = 0;
const DUMMY_MODE_LABELS = ["PASSIVE", "ATTACK", "PARRY TRAIN"];
let dummyMode = 1;
let tutorialMode = false;
let tutorialStep = 0;
let tutorialMoveStartX = 0;
let tutorialJumpStartGround = false;
let tutorialHeavyDone = false;
let tutorialSpecialDone = false;
let tutorialComplete = false;
let tutorialCompleteAt = 0;
const TUTORIAL_COMPLETE_DELAY_MS = 1500;
const TUTORIAL_STEPS = [
  { text: () => `Move with ${codeToDisplay(getP1Keybinds("solo").moveLeft)} and ${codeToDisplay(getP1Keybinds("solo").moveRight)}`, done: () => Math.abs(player.pos.x - tutorialMoveStartX) > 30 },
  { text: () => `Jump with ${codeToDisplay(getP1Keybinds("solo").jump)}`, done: () => !player.onGround && tutorialJumpStartGround },
  { text: () => `Attack with ${codeToDisplay(getP1Keybinds("solo").heavy)} (heavy) AND ${codeToDisplay(getP1Keybinds("solo").special)} (special)`, done: () => tutorialHeavyDone && tutorialSpecialDone },
  { text: () => `Block with ${codeToDisplay(getP1Keybinds("solo").block)}`, done: () => player.blocking },
  { text: "Parry: block just before the dummy hits you!", done: () => hitEffects.some(e => e.type === "text" && e.text === "PARRY!") },
];
let dummyNextAttackAt = 1000;
let hitstopUntil = 0, shakeUntil = 0, shakeMagnitude = 0;
let koSlowmoUntil = 0, koFlashUntil = 0;
const hitEffects = (typeof global !== "undefined" && global.hitEffects) ? global.hitEffects : [];

function _cloneFighter(f) {
  if (!f) return null;
  return {
    ...f,
    pos: { ...f.pos },
    prevPos: { ...f.prevPos },
    vel: { ...f.vel },
    size: { ...f.size },
  };
}

function saveState() {
  const g = typeof global !== "undefined" ? global : null;
  const sim = g ? g.simFrame : simFrame;
  const p = g ? g.player : player;
  const p2 = g ? g.player2 : player2;
  const d = g ? g.dummy : dummy;
  const pStocks = g ? g.playerStocks : playerStocks;
  const p2Stocks = g ? g.player2Stocks : player2Stocks;
  const dStocks = g ? g.dummyStocks : dummyStocks;
  const rOver = g ? g.roundOver : roundOver;
  const rOverSel = g ? g.roundOverSelection : roundOverSelection;
  const rOverStart = g ? g.roundOverStartTime : roundOverStartTime;
  const rOverWin = g ? g.roundOverWinner : roundOverWinner;
  return {
    simFrame: sim,

    // Entities
    player: _cloneFighter(p),
    player2: p2 ? _cloneFighter(p2) : null,
    dummy: _cloneFighter(d),

    // Global match state
    playerStocks: pStocks,
    player2Stocks: p2Stocks,
    dummyStocks: dStocks,
    roundOver: rOver,
    roundOverSelection: rOverSel,
    roundOverStartTime: rOverStart,
    roundOverWinner: rOverWin,
    gamePaused,
    pauseMenuSelection,
    bestComboCount,
    bestComboDamage,
    currentComboCount,
    currentComboDamage,
    lastComboHitTime,
    dummyMode,
    dummyNextAttackAt,
    tutorialMode,
    tutorialStep,
    tutorialMoveStartX,
    tutorialJumpStartGround,
    tutorialHeavyDone,
    tutorialSpecialDone,
    tutorialComplete,
    tutorialCompleteAt,

    // FX / hitstop
    hitstopUntil,
    shakeUntil,
    shakeMagnitude,
    koSlowmoUntil,
    koFlashUntil,

    // Deterministic input bookkeeping
    p1InputBits,
    p2InputBits,
    p1PrevInputBits,
    p2PrevInputBits,
    p1LastJumpPressAt,
    p2LastJumpPressAt,

    // Collections
    activeHitboxes: activeHitboxes.map(h => ({ ...h })),
    hitEffects: hitEffects.map(e => ({ ...e })),
  };
}

function loadState(state) {
  if (typeof global !== "undefined") {
    const frame = state.simFrame | 0;
    global.simFrame = frame;
    simFrame = frame;
    global.player = _cloneFighter(state.player);
    global.player2 = state.player2 ? _cloneFighter(state.player2) : null;
    global.dummy = _cloneFighter(state.dummy);
    global.gameState = global.GAME_STATE.VERSUS;
    gameState = GAME_STATE.VERSUS;
    global.playerStocks = state.playerStocks;
    global.player2Stocks = state.player2Stocks;
    global.dummyStocks = state.dummyStocks;
    global.roundOver = state.roundOver;
    global.roundOverSelection = state.roundOverSelection;
    global.roundOverStartTime = state.roundOverStartTime;
    global.roundOverWinner = state.roundOverWinner;
    global.gamePaused = state.gamePaused;
    global.pauseMenuSelection = state.pauseMenuSelection;
    global.bestComboCount = state.bestComboCount;
    global.bestComboDamage = state.bestComboDamage;
    global.currentComboCount = state.currentComboCount;
    global.currentComboDamage = state.currentComboDamage;
    global.lastComboHitTime = state.lastComboHitTime;
    global.dummyMode = state.dummyMode;
    global.dummyNextAttackAt = state.dummyNextAttackAt;
    global.tutorialMode = state.tutorialMode;
    global.tutorialStep = state.tutorialStep;
    global.tutorialMoveStartX = state.tutorialMoveStartX;
    global.tutorialJumpStartGround = state.tutorialJumpStartGround;
    global.tutorialHeavyDone = state.tutorialHeavyDone;
    global.tutorialSpecialDone = state.tutorialSpecialDone;
    global.tutorialComplete = state.tutorialComplete;
    global.tutorialCompleteAt = state.tutorialCompleteAt;
    global.hitstopUntil = state.hitstopUntil;
    global.shakeUntil = state.shakeUntil;
    global.shakeMagnitude = state.shakeMagnitude;
    global.koSlowmoUntil = state.koSlowmoUntil;
    global.koFlashUntil = state.koFlashUntil;
    global.p1InputBits = state.p1InputBits | 0;
    global.p2InputBits = state.p2InputBits | 0;
    global.p1PrevInputBits = state.p1PrevInputBits | 0;
    global.p2PrevInputBits = state.p2PrevInputBits | 0;
    global.p1LastJumpPressAt = state.p1LastJumpPressAt;
    global.p2LastJumpPressAt = state.p2LastJumpPressAt;
    global.activeHitboxes.length = 0;
    for (const hb of state.activeHitboxes) global.activeHitboxes.push({ ...hb });
    global.hitEffects.length = 0;
    for (const e of state.hitEffects) global.hitEffects.push({ ...e });
    return;
  }
  simFrame = state.simFrame | 0;

  player = _cloneFighter(state.player);
  player2 = state.player2 ? _cloneFighter(state.player2) : null;
  dummy = _cloneFighter(state.dummy);

  playerStocks = state.playerStocks;
  player2Stocks = state.player2Stocks;
  dummyStocks = state.dummyStocks;
  roundOver = state.roundOver;
  roundOverSelection = state.roundOverSelection;
  roundOverStartTime = state.roundOverStartTime;
  roundOverWinner = state.roundOverWinner;
  gamePaused = state.gamePaused;
  pauseMenuSelection = state.pauseMenuSelection;
  bestComboCount = state.bestComboCount;
  bestComboDamage = state.bestComboDamage;
  currentComboCount = state.currentComboCount;
  currentComboDamage = state.currentComboDamage;
  lastComboHitTime = state.lastComboHitTime;
  dummyMode = state.dummyMode;
  dummyNextAttackAt = state.dummyNextAttackAt;
  tutorialMode = state.tutorialMode;
  tutorialStep = state.tutorialStep;
  tutorialMoveStartX = state.tutorialMoveStartX;
  tutorialJumpStartGround = state.tutorialJumpStartGround;
  tutorialHeavyDone = state.tutorialHeavyDone;
  tutorialSpecialDone = state.tutorialSpecialDone;
  tutorialComplete = state.tutorialComplete;
  tutorialCompleteAt = state.tutorialCompleteAt;

  hitstopUntil = state.hitstopUntil;
  shakeUntil = state.shakeUntil;
  shakeMagnitude = state.shakeMagnitude;
  koSlowmoUntil = state.koSlowmoUntil;
  koFlashUntil = state.koFlashUntil;

  p1InputBits = state.p1InputBits | 0;
  p2InputBits = state.p2InputBits | 0;
  p1PrevInputBits = state.p1PrevInputBits | 0;
  p2PrevInputBits = state.p2PrevInputBits | 0;
  p1LastJumpPressAt = state.p1LastJumpPressAt;
  p2LastJumpPressAt = state.p2LastJumpPressAt;

  activeHitboxes.length = 0;
  for (const hb of state.activeHitboxes) activeHitboxes.push({ ...hb });
  hitEffects.length = 0;
  for (const e of state.hitEffects) hitEffects.push({ ...e });
}

function runDeterminismSelfTest(framesToSimulate) {
  const frames = framesToSimulate != null ? framesToSimulate | 0 : 240;
  const start = saveState();
  const startFrame = simFrame | 0;

  // Deterministic pseudo-random input sequence (LCG).
  let seed = 0xC0FFEE ^ (startFrame * 2654435761);
  const seq = new Array(frames);
  for (let i = 0; i < frames; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    // Only allow a small subset of buttons to reduce chaos.
    let bits = 0;
    if (seed & 1) bits |= INPUT_BITS.LEFT;
    if (seed & 2) bits |= INPUT_BITS.RIGHT;
    if (seed & 4) bits |= INPUT_BITS.JUMP;
    if (seed & 8) bits |= INPUT_BITS.FAST_FALL;
    if (seed & 16) bits |= INPUT_BITS.DASH;
    if (seed & 32) bits |= INPUT_BITS.BLOCK;
    if (seed & 64) bits |= INPUT_BITS.SPECIAL;
    if (seed & 128) bits |= INPUT_BITS.HEAVY;
    // Never hold left+right.
    if ((bits & INPUT_BITS.LEFT) && (bits & INPUT_BITS.RIGHT)) bits &= ~INPUT_BITS.RIGHT;
    seq[i] = bits | 0;
  }

  const simulateSeq = () => {
    for (let i = 0; i < frames; i++) {
      const f = startFrame + i;
      const now = f * SIM_FRAME_MS;
      let dtScaled = SIM_DT;
      if (now < koSlowmoUntil) dtScaled *= KO_SLOWMO_SCALE;
      stepGameplay(dtScaled, now, seq[i], 0);
      simFrame = f + 1;
    }
    return saveState();
  };

  let a, b, ok = false;
  try {
    a = simulateSeq();
    loadState(start);
    simFrame = startFrame;
    b = simulateSeq();
    ok = JSON.stringify(a) === JSON.stringify(b);
  } catch (e) {
    ok = false;
    determinismTestMessage = "Determinism test error: " + (e && e.message ? e.message : String(e));
    determinismTestMessageUntil = performance.now() + 3000;
  } finally {
    loadState(start);
    simFrame = startFrame;
  }

  if (determinismTestMessage == null) {
    determinismTestMessage = ok ? `Determinism OK (${frames} frames)` : `Determinism MISMATCH (${frames} frames)`;
    determinismTestMessageUntil = performance.now() + 2500;
  }
}

// ---------- PER-FRAME INPUT (deterministic) ----------
const INPUT_BITS = {
  LEFT: 1 << 0,
  RIGHT: 1 << 1,
  JUMP: 1 << 2,
  FAST_FALL: 1 << 3,
  DASH: 1 << 4,
  BLOCK: 1 << 5,
  SPECIAL: 1 << 6,
  HEAVY: 1 << 7,
};

let p1InputBits = 0;
let p2InputBits = 0;
let p1PrevInputBits = 0;
let p2PrevInputBits = 0;

let p1Held = { left: false, right: false, jump: false, fastFall: false, dash: false, block: false, special: false, heavy: false };
let p2Held = { left: false, right: false, jump: false, fastFall: false, dash: false, block: false, special: false, heavy: false };
let p1Pressed = { jump: false, dash: false, block: false, special: false, heavy: false };
let p2Pressed = { jump: false, dash: false, block: false, special: false, heavy: false };
let p1JumpReleased = false;
let p2JumpReleased = false;
let p1LastJumpPressAt = 0;
let p2LastJumpPressAt = 0;

function _bitsFromKeysForP1(profile) {
  const kb = getP1Keybinds(profile);
  let bits = 0;
  if (keys.has(kb.moveLeft)) bits |= INPUT_BITS.LEFT;
  if (keys.has(kb.moveRight)) bits |= INPUT_BITS.RIGHT;
  if (keys.has(kb.jump)) bits |= INPUT_BITS.JUMP;
  if (keys.has(kb.fastFall)) bits |= INPUT_BITS.FAST_FALL;
  if (keys.has(kb.dash)) bits |= INPUT_BITS.DASH;
  if (keys.has(kb.block)) bits |= INPUT_BITS.BLOCK;
  if (keys.has(kb.special)) bits |= INPUT_BITS.SPECIAL;
  if (keys.has(kb.heavy)) bits |= INPUT_BITS.HEAVY;
  return bits;
}

function _bitsFromKeysForP2() {
  let bits = 0;
  if (keys.has(p2Keybinds.moveLeft)) bits |= INPUT_BITS.LEFT;
  if (keys.has(p2Keybinds.moveRight)) bits |= INPUT_BITS.RIGHT;
  if (keys.has(p2Keybinds.jump)) bits |= INPUT_BITS.JUMP;
  if (keys.has(p2Keybinds.fastFall)) bits |= INPUT_BITS.FAST_FALL;
  if (keys.has(p2Keybinds.dash)) bits |= INPUT_BITS.DASH;
  if (keys.has(p2Keybinds.block)) bits |= INPUT_BITS.BLOCK;
  if (keys.has(p2Keybinds.special)) bits |= INPUT_BITS.SPECIAL;
  if (keys.has(p2Keybinds.heavy)) bits |= INPUT_BITS.HEAVY;
  return bits;
}

function applyInputBitsForSimFrame(p1Bits, p2Bits, now) {
  p1InputBits = p1Bits | 0;
  p2InputBits = p2Bits | 0;

  p1JumpReleased = !(p1InputBits & INPUT_BITS.JUMP) && !!(p1PrevInputBits & INPUT_BITS.JUMP);
  p2JumpReleased = !(p2InputBits & INPUT_BITS.JUMP) && !!(p2PrevInputBits & INPUT_BITS.JUMP);

  p1Held = {
    left: !!(p1InputBits & INPUT_BITS.LEFT),
    right: !!(p1InputBits & INPUT_BITS.RIGHT),
    jump: !!(p1InputBits & INPUT_BITS.JUMP),
    fastFall: !!(p1InputBits & INPUT_BITS.FAST_FALL),
    dash: !!(p1InputBits & INPUT_BITS.DASH),
    block: !!(p1InputBits & INPUT_BITS.BLOCK),
    special: !!(p1InputBits & INPUT_BITS.SPECIAL),
    heavy: !!(p1InputBits & INPUT_BITS.HEAVY),
  };
  p2Held = {
    left: !!(p2InputBits & INPUT_BITS.LEFT),
    right: !!(p2InputBits & INPUT_BITS.RIGHT),
    jump: !!(p2InputBits & INPUT_BITS.JUMP),
    fastFall: !!(p2InputBits & INPUT_BITS.FAST_FALL),
    dash: !!(p2InputBits & INPUT_BITS.DASH),
    block: !!(p2InputBits & INPUT_BITS.BLOCK),
    special: !!(p2InputBits & INPUT_BITS.SPECIAL),
    heavy: !!(p2InputBits & INPUT_BITS.HEAVY),
  };

  p1Pressed = {
    jump: !!(p1InputBits & INPUT_BITS.JUMP) && !(p1PrevInputBits & INPUT_BITS.JUMP),
    dash: !!(p1InputBits & INPUT_BITS.DASH) && !(p1PrevInputBits & INPUT_BITS.DASH),
    block: !!(p1InputBits & INPUT_BITS.BLOCK) && !(p1PrevInputBits & INPUT_BITS.BLOCK),
    special: !!(p1InputBits & INPUT_BITS.SPECIAL) && !(p1PrevInputBits & INPUT_BITS.SPECIAL),
    heavy: !!(p1InputBits & INPUT_BITS.HEAVY) && !(p1PrevInputBits & INPUT_BITS.HEAVY),
  };
  p2Pressed = {
    jump: !!(p2InputBits & INPUT_BITS.JUMP) && !(p2PrevInputBits & INPUT_BITS.JUMP),
    dash: !!(p2InputBits & INPUT_BITS.DASH) && !(p2PrevInputBits & INPUT_BITS.DASH),
    block: !!(p2InputBits & INPUT_BITS.BLOCK) && !(p2PrevInputBits & INPUT_BITS.BLOCK),
    special: !!(p2InputBits & INPUT_BITS.SPECIAL) && !(p2PrevInputBits & INPUT_BITS.SPECIAL),
    heavy: !!(p2InputBits & INPUT_BITS.HEAVY) && !(p2PrevInputBits & INPUT_BITS.HEAVY),
  };

  if (p1Pressed.jump) p1LastJumpPressAt = now;
  if (p2Pressed.jump) p2LastJumpPressAt = now;

  p1PrevInputBits = p1InputBits;
  p2PrevInputBits = p2InputBits;

  if (typeof global !== "undefined") {
    global.p1Held = p1Held;
    global.p2Held = p2Held;
    global.p1Pressed = p1Pressed;
    global.p2Pressed = p2Pressed;
  }
}

function sampleInputsForSimFrame(now) {
  const p1Profile = gameState === GAME_STATE.VERSUS ? "local" : "solo";
  const p1Bits = _bitsFromKeysForP1(p1Profile);
  const p2Bits = (gameState === GAME_STATE.VERSUS && player2) ? _bitsFromKeysForP2() : 0;
  applyInputBitsForSimFrame(p1Bits, p2Bits, now);
}

function stepGameplay(dt, now, overrideP1Bits, overrideP2Bits) {
  if (gameState !== GAME_STATE.PRACTICE && gameState !== GAME_STATE.VERSUS) return;
  if (roundOver || gamePaused) return;

  if (overrideP1Bits != null || overrideP2Bits != null) {
    applyInputBitsForSimFrame(overrideP1Bits | 0, overrideP2Bits | 0, now);
  } else {
    sampleInputsForSimFrame(now);
  }

  handlePlayerInput(dt, now);
  integrateFighter(player, dt, now);

  if (gameState === GAME_STATE.VERSUS && player2) {
    handlePlayer2Input(dt, now);
    integrateFighter(player2, dt, now);
    applyBlastZoneRespawn(player2, false, now);
  } else {
    integrateFighter(dummy, dt, now);
    applyBlastZoneRespawn(dummy, true, now);
    handleDummyAI(now);
  }
  resolvePlayerDummyCollision();
  applyBlastZoneRespawn(player, false, now);
  handleCombat(dt, now);
  updateTutorial(now);
  if (typeof global !== "undefined") simFrame++;
}

function handlePlayerInput(dt, now) {
  const inStun = now < player.stunnedUntil;
  const rolling = now < player.rollingUntil;

  player.blocking = !!p1Held.block;
  if (p1Pressed.block && player.onGround) {
    if (now >= player.parryLockoutUntil) {
      player.parryWindowUntil = now + PARRY_WINDOW_MS;
      player.parryLockoutUntil = now + PARRY_LOCKOUT_MS;
    }
  }

  let moveDir = 0;
  if (!inStun) { if (p1Held.left) moveDir -= 1; if (p1Held.right) moveDir += 1; }
  const moveSpeed = player.moveSpeed || MOVE_SPEED;

  if (!rolling) {
    if (moveDir !== 0) { player.vel.x = moveSpeed * moveDir; player.facing = moveDir; }
    else {
      const friction = HORIZONTAL_DAMPING * dt;
      player.vel.x -= player.vel.x * friction;
      if (Math.abs(player.vel.x) < 2) player.vel.x = 0;
    }
  } else player.vel.x *= 0.98;

  if (!inStun && !rolling && p1Pressed.dash && !player.onGround) {
    const dir = moveDir !== 0 ? moveDir : player.facing;
    player.vel.x = DASH_SPEED * dir;
    player.rollingUntil = now + ROLL_DURATION_MS;
    player.rollInvulnUntil = now + ROLL_DURATION_MS * 0.7;
    player.onGround = false;
  }

  if (!inStun && p1Pressed.jump && player.jumpsRemaining > 0) {
    const isDoubleJump = player.jumpsRemaining === 1 && !player.onGround;
    if (isDoubleJump) {
      player.vel.y = player.doubleJumpVel || DOUBLE_JUMP_VELOCITY;
      player.lastJumpWasDouble = true;
    } else {
      const timeSincePress = now - p1LastJumpPressAt;
      const isShortHop = timeSincePress >= 0 && timeSincePress <= SHORT_HOP_MAX_MS;
      const fj = player.firstJumpVel || FIRST_JUMP_VELOCITY;
      player.vel.y = isShortHop ? fj * SHORT_HOP_MULT : fj;
      player.lastJumpWasDouble = false;
    }
    player.onGround = false;
    player.jumpsRemaining -= 1;
    playSfx("jump");
  }
  // Variable jump height cut on jump release.
  if (p1JumpReleased && player && !player.lastJumpWasDouble && player.vel.y < 0) player.vel.y *= 0.5;

  if (p1Pressed.special) {
    const input = !player.onGround ? "air" : (p1Held.fastFall ? "down" : ((p1Held.left || p1Held.right) ? "right" : "neutral"));
    performSpecialFor(player, "player", input, now);
    if (tutorialMode && tutorialStep === 2) tutorialSpecialDone = true;
  }
  if (p1Pressed.heavy) {
    spawnAttackFor(player, "player", "heavy", now);
    if (tutorialMode && tutorialStep === 2) tutorialHeavyDone = true;
  }
}

function handlePlayer2Input(dt, now) {
  if (!player2) return;
  const inStun = now < player2.stunnedUntil;
  const rolling = now < player2.rollingUntil;

  player2.blocking = !!p2Held.block;
  if (p2Pressed.block && player2.onGround) {
    if (now >= player2.parryLockoutUntil) {
      player2.parryWindowUntil = now + PARRY_WINDOW_MS;
      player2.parryLockoutUntil = now + PARRY_LOCKOUT_MS;
    }
  }

  let moveDir = 0;
  if (!inStun) { if (p2Held.left) moveDir -= 1; if (p2Held.right) moveDir += 1; }
  const moveSpeed = player2.moveSpeed || MOVE_SPEED;

  if (!rolling) {
    if (moveDir !== 0) {
      player2.vel.x = moveSpeed * moveDir;
      player2.facing = moveDir;
    } else {
      const friction = HORIZONTAL_DAMPING * dt;
      player2.vel.x -= player2.vel.x * friction;
      if (Math.abs(player2.vel.x) < 2) player2.vel.x = 0;
    }
  } else player2.vel.x *= 0.98;

  if (!inStun && !rolling && p2Pressed.dash && !player2.onGround) {
    const dir = moveDir !== 0 ? moveDir : player2.facing;
    player2.vel.x = DASH_SPEED * dir;
    player2.rollingUntil = now + ROLL_DURATION_MS;
    player2.rollInvulnUntil = now + ROLL_DURATION_MS * 0.7;
    player2.onGround = false;
  }

  if (!inStun && p2Pressed.jump && player2.jumpsRemaining > 0) {
    const isDoubleJump = player2.jumpsRemaining === 1 && !player2.onGround;
    if (isDoubleJump) {
      player2.vel.y = player2.doubleJumpVel || DOUBLE_JUMP_VELOCITY;
      player2.lastJumpWasDouble = true;
    } else {
      const timeSincePress = now - p2LastJumpPressAt;
      const isShortHop = timeSincePress >= 0 && timeSincePress <= SHORT_HOP_MAX_MS;
      const fj = player2.firstJumpVel || FIRST_JUMP_VELOCITY;
      player2.vel.y = isShortHop ? fj * SHORT_HOP_MULT : fj;
      player2.lastJumpWasDouble = false;
    }
    player2.onGround = false;
    player2.jumpsRemaining -= 1;
    playSfx("jump");
  }
  if (p2JumpReleased && player2 && !player2.lastJumpWasDouble && player2.vel.y < 0) player2.vel.y *= 0.5;

  if (p2Pressed.special) {
    const input = !player2.onGround ? "air" : (p2Held.fastFall ? "down" : ((p2Held.left || p2Held.right) ? "right" : "neutral"));
    performSpecialFor(player2, "player2", input, now);
  }
  if (p2Pressed.heavy) spawnAttackFor(player2, "player2", "heavy", now);
}

function handleDummyAI(now) {
  if (gameState !== GAME_STATE.PRACTICE || roundOver || dummyMode === 0 || now < dummyNextAttackAt) return;
  const dx = player.pos.x - dummy.pos.x;
  const distanceX = Math.abs(dx);
  const sameHeight = Math.abs(player.pos.y - dummy.pos.y) < 40;
  if (distanceX < 260 && sameHeight && dummy.onGround) {
    dummy.facing = dx >= 0 ? 1 : -1;
    const kind = dummyMode === 2 ? "heavy" : (Math.random() < 0.6 ? "light" : "heavy");
    spawnAttackFor(dummy, "dummy", kind);
    dummyNextAttackAt = now + 400 + Math.random() * 500;
  }
}

function handleCombat(dt, now) {
  const opponent = getOpponent();
  const playerBox = getAABB(player);
  const opponentBox = getAABB(opponent);

  // Move any projectile/special hitboxes that have velocity.
  for (const hb of activeHitboxes) {
    if (hb.vx || hb.vy) {
      hb.x += (hb.vx || 0) * dt;
      hb.y += (hb.vy || 0) * dt;
    }
  }

  for (let i = activeHitboxes.length - 1; i >= 0; i--) {
    const hb = activeHitboxes[i];
    const lifetime = hb.lifetimeMs || ATTACK_LIFETIME_MS;
    if (now - hb.createdAt > lifetime) { activeHitboxes.splice(i, 1); continue; }
    const hbBox = { x: hb.x, y: hb.y, w: hb.w, h: hb.h };

    const applyHit = (victim, attacker) => {
      const isLight = hb.kind === "light";
      if (victim.invulnUntil && now < victim.invulnUntil) return;
      const canBlock = !hb.ignoreBlock && victim.onGround && victim.blocking;
      const isParry = canBlock && now < victim.parryWindowUntil;
      let knockbackMult = 1;
      let damageToApply = hb.damage;
      if (isParry) {
        knockbackMult = PARRY_KNOCKBACK_MULT;
        damageToApply = 0;
        victim.parryFlashUntil = now + 150;
        attacker.stunnedUntil = Math.max(attacker.stunnedUntil, now + PARRY_STUN_ATTACKER_MS);
        hitstopUntil = Math.max(hitstopUntil, now + HITSTOP_PARRY_MS);
        hitEffects.push({ type: "text", text: "PARRY!", x: victim.pos.x, y: victim.pos.y - 50, createdAt: now, duration: 200 });
        playSfx("parry");
      } else if (canBlock && !isParry) {
        knockbackMult = BLOCK_KNOCKBACK_MULT;
        damageToApply = Math.floor(hb.damage * BLOCK_DAMAGE_MULT);
        const blockstun = isLight ? BLOCKSTUN_LIGHT_MS : BLOCKSTUN_HEAVY_MS;
        victim.stunnedUntil = Math.max(victim.stunnedUntil, now + blockstun);
        hitstopUntil = Math.max(hitstopUntil, now + (isLight ? HITSTOP_BLOCK_LIGHT_MS : HITSTOP_BLOCK_HEAVY_MS));
        playSfx("block");
      } else {
        const hitstun = isLight ? HITSTUN_LIGHT_MS : HITSTUN_HEAVY_MS;
        victim.stunnedUntil = Math.max(victim.stunnedUntil, now + hitstun);
        if (hb.style === "trap") playSfx("trap");
        else playSfx(isLight ? "hitLight" : "hitHeavy");
      }

      victim.damage += damageToApply;
      updateHUD();

      if (attacker === player && victim === opponent && !victim.blocking && !isParry && damageToApply > 0) {
        if (now - lastComboHitTime > COMBO_RESET_MS) { currentComboCount = 1; currentComboDamage = damageToApply; }
        else { currentComboCount += 1; currentComboDamage += damageToApply; }
        lastComboHitTime = now;
        if (currentComboCount > bestComboCount) { bestComboCount = currentComboCount; bestComboDamage = currentComboDamage; }
      }

      let knockbackMagnitude = (hb.base + victim.damage * hb.scaling) * knockbackMult / victim.weight;
      if (victim.damage >= 100) {
        const vulnMult = hb.kind === "heavy" ? VULNERABILITY_AT_100_HEAVY : VULNERABILITY_AT_100_LIGHT;
        knockbackMagnitude *= vulnMult;
      }
      const dx = victim.pos.x - attacker.pos.x;
      const dirX = dx >= 0 ? 1 : -1;
      let dirY = typeof hb.dirY === "number" ? hb.dirY : -0.4;
      if (attacker.pos.y + attacker.size.h * 0.2 < victim.pos.y && dirY < 0) dirY = Math.abs(dirY) || 0.5;
      const len = Math.hypot(dirX, dirY) || 1;
      let vx = (knockbackMagnitude * dirX) / len;
      let vy = (knockbackMagnitude * dirY) / len;

      if (victim === player) {
        const diInput = (p1Held.right ? 1 : 0) - (p1Held.left ? 1 : 0);
        if (diInput !== 0) {
          const diStrength = 0.25;
          const diAdjust = knockbackMagnitude * diStrength * diInput;
          const newVx = vx + diAdjust;
          const len2 = Math.hypot(newVx, vy) || 1;
          const scale = knockbackMagnitude / len2;
          vx = newVx * scale;
          vy = vy * scale;
        }
      } else if (victim === player2) {
        const diInput = (p2Held.right ? 1 : 0) - (p2Held.left ? 1 : 0);
        if (diInput !== 0) {
          const diStrength = 0.25;
          const diAdjust = knockbackMagnitude * diStrength * diInput;
          const newVx = vx + diAdjust;
          const len2 = Math.hypot(newVx, vy) || 1;
          const scale = knockbackMagnitude / len2;
          vx = newVx * scale;
          vy = vy * scale;
        }
      } else if (victim === dummy) {
        const diAway = victim.pos.x - player.pos.x >= 0 ? 1 : -1;
        const dummyDIStrength = 0.18;
        const diAdjust = knockbackMagnitude * dummyDIStrength * diAway;
        const newVx = vx + diAdjust;
        const len2 = Math.hypot(newVx, vy) || 1;
        const scale = knockbackMagnitude / len2;
        vx = newVx * scale;
        vy = vy * scale;
      }
      victim.vel.x = vx;
      victim.vel.y = vy;
      victim.onGround = false;

      if ((victim.rollInvulnUntil || 0) > 0 && now < victim.rollInvulnUntil && now < (victim.rollingUntil || 0)) return;
      hitstopUntil = Math.max(hitstopUntil, now + (isLight ? HITSTOP_LIGHT_MS : HITSTOP_HEAVY_MS));
      hitEffects.push({ type: "spark", x: victim.pos.x, y: victim.pos.y - victim.size.h * 0.3, createdAt: now, duration: 180, isHeavy: !isLight });
      hitEffects.push({ type: "arrow", x: victim.pos.x, y: victim.pos.y, angle: Math.atan2(vy, vx), createdAt: now, duration: 200 });

      if (hb.kind === "heavy" && !player.onGround && typeof hb.dirY === "number" && hb.dirY > 0.5 && attacker === player) {
        player.vel.y = player.firstJumpVel || FIRST_JUMP_VELOCITY;
        player.onGround = false;
      }
    };

    if (hb.owner === "player" && rectsOverlap(hbBox, opponentBox)) {
      applyHit(opponent, player);
      activeHitboxes.splice(i, 1);
    } else if ((hb.owner === "dummy" || hb.owner === "player2") && rectsOverlap(hbBox, playerBox)) {
      applyHit(player, opponent);
      activeHitboxes.splice(i, 1);
    }
  }
}

function updateHUD() {
  if (typeof global !== "undefined" || typeof dummyDamageLabel === "undefined") return;
  if (gameState === GAME_STATE.VERSUS && player2) {
    const p1 = Math.round(player.damage), p2 = Math.round(player2.damage);
    if (dummyDamageLabel.parentNode && dummyDamageLabel.parentNode.firstChild) {
      dummyDamageLabel.parentNode.firstChild.nodeValue = player.name + ": ";
      playerDamageLabel.parentNode.firstChild.nodeValue = player2.name + ": ";
    }
    function stockIcons(n) {
      return "●".repeat(Math.max(0, Math.min(n, MAX_STOCKS)));
    }
    const p1StocksText = stockIcons(playerStocks);
    const p2StocksText = stockIcons(player2Stocks);
    dummyDamageLabel.textContent = `${p1StocksText} ${p1}%`;
    playerDamageLabel.textContent = `${p2StocksText} ${p2}%`;
    function colorForDamage(val) {
      if (val < 60) return "#9dffde";
      if (val < 120) return "#ffe28a";
      return "#ff6b6b";
    }
    dummyDamageLabel.style.color = colorForDamage(p1);
    playerDamageLabel.style.color = colorForDamage(p2);
    function updateKillHint(el, val) {
      if (val >= KILL_HINT_DAMAGE) {
        el.style.textShadow = "0 0 8px rgba(255,107,107,0.9)";
      } else {
        el.style.textShadow = "none";
      }
    }
    updateKillHint(dummyDamageLabel, p1);
    updateKillHint(playerDamageLabel, p2);
  } else {
    const d = Math.round(dummy.damage), p = Math.round(player.damage);
    if (dummyDamageLabel.parentNode && dummyDamageLabel.parentNode.firstChild) {
      dummyDamageLabel.parentNode.firstChild.nodeValue = "Dummy: ";
      playerDamageLabel.parentNode.firstChild.nodeValue = "Player: ";
    }
    dummyDamageLabel.textContent = d + "%";
    playerDamageLabel.textContent = p + "%";
    function colorForDamage(val) {
      if (val < 60) return "#9dffde";
      if (val < 120) return "#ffe28a";
      return "#ff6b6b";
    }
    dummyDamageLabel.style.color = colorForDamage(d);
    playerDamageLabel.style.color = colorForDamage(p);
  }
}

function getOpponent() {
  return gameState === GAME_STATE.VERSUS ? player2 : dummy;
}

function updateTutorial(now) {
  if (!tutorialMode || !player || gamePaused || roundOver) return;
  if (tutorialStep >= TUTORIAL_STEPS.length) {
    if (tutorialCompleteAt > 0 && now - tutorialCompleteAt >= TUTORIAL_COMPLETE_DELAY_MS) tutorialComplete = true;
    return;
  }
  if (tutorialStep === 1 && player.onGround) tutorialJumpStartGround = true;
  if (TUTORIAL_STEPS[tutorialStep].done()) {
    tutorialStep++;
    tutorialMoveStartX = player.pos.x;
    tutorialJumpStartGround = player.onGround;
    tutorialHeavyDone = false;
    tutorialSpecialDone = false;
    if (tutorialStep >= TUTORIAL_STEPS.length) tutorialCompleteAt = now;
    dummyMode = tutorialStep >= 4 ? 2 : 0;
  }
}

function startPractice() {
  gameState = GAME_STATE.PRACTICE;
  tutorialMode = false;
  stageIndex = Math.floor(Math.random() * 3);
  _initPractice();
}

function startTutorial() {
  gameState = GAME_STATE.PRACTICE;
  tutorialMode = true;
  tutorialStep = 0;
  tutorialComplete = false;
  tutorialCompleteAt = 0;
  tutorialMoveStartX = playerStart.x;
  tutorialJumpStartGround = true;
  tutorialHeavyDone = false;
  tutorialSpecialDone = false;
  _initPractice();
  dummyMode = tutorialStep >= 4 ? 2 : 0;
}

function _initPractice() {
  resetSimClock();
  // Sync input "prev" to current keys so we don't block first press (stale prev from menu/previous session).
  const p1Bits = _bitsFromKeysForP1("solo");
  p1InputBits = p1Bits | 0;
  p1PrevInputBits = p1Bits | 0;
  p2InputBits = 0;
  p2PrevInputBits = 0;

  player = createFighter({ x: playerStart.x, y: playerStart.y, w: 40, h: 70, color: "#3da1ff" });
  playerTypeIndex = 0;
  applyPlayerType(playerTypeIndex);
  dummy = createFighter({
    x: dummyStart.x, y: dummyStart.y, w: 40, h: 80, color: "#ff4b5c",
    name: "Training Dummy", moveSpeed: MOVE_SPEED * 0.9,
    firstJumpVel: FIRST_JUMP_VELOCITY * 0.9, doubleJumpVel: DOUBLE_JUMP_VELOCITY * 0.9, weight: 1.2,
  });
  dummy.isDummy = true;
  player2 = null;
  activeHitboxes.length = 0;
  playerStocks = MAX_STOCKS;
  dummyStocks = MAX_STOCKS;
  roundOver = false;
  roundOverWinner = null;
  bestComboCount = 0;
  bestComboDamage = 0;
  hitEffects.length = 0;
  currentComboCount = 0;
  currentComboDamage = 0;
  if (tutorialMode) {
    tutorialMoveStartX = playerStart.x;
    tutorialJumpStartGround = true;
    tutorialHeavyDone = false;
    tutorialSpecialDone = false;
    dummyMode = tutorialStep >= 4 ? 2 : 0;
  }
  dummyNextAttackAt = simNowMs() + 1000;
  updateHUD();
}

function spawnVersusFighters() {
  resetSimClock();
  player = createFighter({ x: playerStart.x, y: playerStart.y, w: 40, h: 70, color: "#3da1ff" });
  applyPlayerTypeTo(player, p1CharacterIndex);
  player.color = COLOR_PALETTE[p1ColorIndex % COLOR_PALETTE.length];
  player2 = createFighterForType(p2CharacterIndex, player2Start.x, player2Start.y);
  player2.color = COLOR_PALETTE[p2ColorIndex % COLOR_PALETTE.length];
  player2.facing = -1;
  activeHitboxes.length = 0;
  playerStocks = MAX_STOCKS;
  player2Stocks = MAX_STOCKS;
  roundOver = false;
  roundOverWinner = null;
  gamePaused = false;
  bestComboCount = 0;
  bestComboDamage = 0;
  hitEffects.length = 0;
  currentComboCount = 0;
  currentComboDamage = 0;
  updateHUD();
}

function startVersusMatch() {
  spawnVersusFighters();
  gameState = GAME_STATE.VERSUS;
  // Sync input prev to current keys so first press after match start isn't lost (stale prev from menus).
  const p1B = _bitsFromKeysForP1("local");
  const p2B = player2 ? _bitsFromKeysForP2() : 0;
  p1InputBits = p1B | 0;
  p1PrevInputBits = p1B | 0;
  p2InputBits = p2B | 0;
  p2PrevInputBits = p2B | 0;
}

function goToVersusIntro() {
  gameState = GAME_STATE.VERSUS_INTRO;
  screenEnterTime = performance.now();
}

function goToTransition() {
  gameState = GAME_STATE.TRANSITION;
  transitionStartTime = performance.now();
  spawnVersusFighters();
}

function toggleFullscreen() {
  const el = document.getElementById("gameContainer");
  if (!el) return;
  if (document.fullscreenElement) document.exitFullscreen();
  else el.requestFullscreen().catch(() => {});
}

function updateTransition(now) {
  const elapsed = now - transitionStartTime;
  if (elapsed < TRANSITION_DURATION_MS) return;
  // Online: don't use local timer – host uses real-time setTimeout (fixes 8s delay on slow/throttled host), joiner waits for versusGo.
  const isOnline = typeof netcodeIsEnabled === "function" && netcodeIsEnabled() && typeof netcodeGetStats === "function";
  if (isOnline) return;
  gameState = GAME_STATE.VERSUS;
  if (typeof netcodeOnHostEnteredVersus === "function") netcodeOnHostEnteredVersus();
}

function getTransitionCountdown(now) {
  const elapsed = now - transitionStartTime;
  if (elapsed < 1000) return 3;
  if (elapsed < 2000) return 2;
  if (elapsed < 3000) return 1;
  if (elapsed < 3500) return 0;
  return -1;
}

function goToMenu() {
  startTransition(GAME_STATE.MENU);
  menuSelection = 0;
}

function hardReset() {
  if (gameState === GAME_STATE.PRACTICE) {
    if (tutorialMode) startTutorial();
    else startPractice();
  } else if (gameState === GAME_STATE.VERSUS) startVersusMatch();
}

if (typeof global !== "undefined") {
  global.loadState = loadState;
  global.saveState = saveState;
  global.stepGameplay = stepGameplay;
}
if (typeof window !== "undefined") {
  window.STAGE_NAMES = STAGE_NAMES;
  window.GAME_STATE = GAME_STATE;
  window.getGameState = function () { return gameState; };
}

