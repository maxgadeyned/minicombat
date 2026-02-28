"use strict";

const GAME_STATE = { TITLE: "title", MENU: "menu", PRACTICE: "practice", VERSUS_SELECT: "versus_select", TRANSITION: "transition", VERSUS: "versus", P2_SETTINGS: "p2_settings", SETTINGS: "settings" };
let gameState = GAME_STATE.TITLE;
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
let settingsSelection = 0;
let p2SettingsSelection = 0;
let p2SettingsFromSettings = false;
let p2RebindingAction = null;
const P2_SETTINGS_ACTIONS = ["moveLeft", "moveRight", "jump", "fastFall", "dash", "special", "heavy", "block"];
const P2_SETTINGS_LABELS = ["Move Left", "Move Right", "Jump", "Fast Fall", "Dash", "Special", "Heavy", "Block"];
let p1CharacterIndex = 0, p2CharacterIndex = 0;
let p1ColorIndex = 0, p2ColorIndex = 0;
let transitionStartTime = 0;
const TRANSITION_DURATION_MS = 3500;

let playerStocks = MAX_STOCKS, dummyStocks = MAX_STOCKS, player2Stocks = MAX_STOCKS, roundOver = false;
let roundOverSelection = 0;
let roundOverStartTime = 0;
let roundOverWinner = null;
let gamePaused = false;
let pauseMenuSelection = 0;
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
  { text: "Move with A and D", done: () => Math.abs(player.pos.x - tutorialMoveStartX) > 30 },
  { text: "Jump with Space", done: () => !player.onGround && tutorialJumpStartGround },
  { text: "Attack with C (heavy) AND X (special)", done: () => tutorialHeavyDone && tutorialSpecialDone },
  { text: "Block with V", done: () => player.blocking },
  { text: "Parry: block just before the dummy hits you!", done: () => hitEffects.some(e => e.type === "text" && e.text === "PARRY!") },
];
let dummyNextAttackAt = performance.now() + 1000;
let hitstopUntil = 0, shakeUntil = 0, shakeMagnitude = 0;
let koSlowmoUntil = 0, koFlashUntil = 0;
const hitEffects = [];

function handlePlayerInput(dt, now) {
  const inStun = now < player.stunnedUntil;
  const rolling = now < player.rollingUntil;

  if (blockKeyJustPressed && player.onGround) {
    if (now >= player.parryLockoutUntil) {
      player.parryWindowUntil = now + PARRY_WINDOW_MS;
      player.parryLockoutUntil = now + PARRY_LOCKOUT_MS;
    }
  }
  blockKeyJustPressed = false;

  let moveDir = 0;
  if (!inStun) { if (keys.has("KeyA")) moveDir -= 1; if (keys.has("KeyD")) moveDir += 1; }
  const moveSpeed = player.moveSpeed || MOVE_SPEED;

  if (!rolling) {
    if (moveDir !== 0) { player.vel.x = moveSpeed * moveDir; player.facing = moveDir; }
    else {
      const friction = HORIZONTAL_DAMPING * dt;
      player.vel.x -= player.vel.x * friction;
      if (Math.abs(player.vel.x) < 2) player.vel.x = 0;
    }
  } else player.vel.x *= 0.98;

  if (!inStun && !rolling && dashPressed && !player.onGround) {
    const dir = moveDir !== 0 ? moveDir : player.facing;
    player.vel.x = DASH_SPEED * dir;
    player.rollingUntil = now + ROLL_DURATION_MS;
    player.rollInvulnUntil = now + ROLL_DURATION_MS * 0.7;
    player.onGround = false;
  }
  dashPressed = false;

  if (!inStun && jumpPressed && player.jumpsRemaining > 0) {
    const isDoubleJump = player.jumpsRemaining === 1 && !player.onGround;
    if (isDoubleJump) {
      player.vel.y = player.doubleJumpVel || DOUBLE_JUMP_VELOCITY;
      player.lastJumpWasDouble = true;
    } else {
      const timeSincePress = now - lastJumpPressAt;
      const isShortHop = timeSincePress >= 0 && timeSincePress <= SHORT_HOP_MAX_MS;
      const fj = player.firstJumpVel || FIRST_JUMP_VELOCITY;
      player.vel.y = isShortHop ? fj * SHORT_HOP_MULT : fj;
      player.lastJumpWasDouble = false;
    }
    player.onGround = false;
    player.jumpsRemaining -= 1;
  }
  jumpPressed = false;
}

function handlePlayer2Input(dt, now) {
  if (!player2) return;
  const inStun = now < player2.stunnedUntil;
  const rolling = now < player2.rollingUntil;

  if (blockKeyJustPressedP2 && player2.onGround) {
    if (now >= player2.parryLockoutUntil) {
      player2.parryWindowUntil = now + PARRY_WINDOW_MS;
      player2.parryLockoutUntil = now + PARRY_LOCKOUT_MS;
    }
  }
  blockKeyJustPressedP2 = false;

  let moveDir = 0;
  if (!inStun) {
    if (keys.has(p2Keybinds.moveLeft)) moveDir -= 1;
    if (keys.has(p2Keybinds.moveRight)) moveDir += 1;
  }
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

  if (!inStun && !rolling && dashPressedP2 && !player2.onGround) {
    const dir = moveDir !== 0 ? moveDir : player2.facing;
    player2.vel.x = DASH_SPEED * dir;
    player2.rollingUntil = now + ROLL_DURATION_MS;
    player2.rollInvulnUntil = now + ROLL_DURATION_MS * 0.7;
    player2.onGround = false;
  }
  dashPressedP2 = false;

  if (!inStun && jumpPressedP2 && player2.jumpsRemaining > 0) {
    const isDoubleJump = player2.jumpsRemaining === 1 && !player2.onGround;
    if (isDoubleJump) {
      player2.vel.y = player2.doubleJumpVel || DOUBLE_JUMP_VELOCITY;
      player2.lastJumpWasDouble = true;
    } else {
      const timeSincePress = now - lastJumpPressAtP2;
      const isShortHop = timeSincePress >= 0 && timeSincePress <= SHORT_HOP_MAX_MS;
      const fj = player2.firstJumpVel || FIRST_JUMP_VELOCITY;
      player2.vel.y = isShortHop ? fj * SHORT_HOP_MULT : fj;
      player2.lastJumpWasDouble = false;
    }
    player2.onGround = false;
    player2.jumpsRemaining -= 1;
  }
  jumpPressedP2 = false;
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
        shakeUntil = Math.max(shakeUntil, now + 80);
        shakeMagnitude = Math.max(shakeMagnitude, SHAKE_PARRY);
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
        const diInput = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
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
        const diInput = (keys.has(p2Keybinds.moveRight) ? 1 : 0) - (keys.has(p2Keybinds.moveLeft) ? 1 : 0);
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
      shakeUntil = Math.max(shakeUntil, now + 100);
      shakeMagnitude = Math.max(shakeMagnitude, isLight ? SHAKE_LIGHT : SHAKE_HEAVY);
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
  if (gameState === GAME_STATE.VERSUS && player2) {
    const p1 = Math.round(player.damage), p2 = Math.round(player2.damage);
    if (dummyDamageLabel.parentNode && dummyDamageLabel.parentNode.firstChild) {
      dummyDamageLabel.parentNode.firstChild.nodeValue = player.name + ": ";
      playerDamageLabel.parentNode.firstChild.nodeValue = player2.name + ": ";
    }
    dummyDamageLabel.textContent = p1 + "%";
    playerDamageLabel.textContent = p2 + "%";
    function colorForDamage(val) {
      if (val < 60) return "#9dffde";
      if (val < 120) return "#ffe28a";
      return "#ff6b6b";
    }
    dummyDamageLabel.style.color = colorForDamage(p1);
    playerDamageLabel.style.color = colorForDamage(p2);
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
  updateHUD();
}

function startVersusMatch() {
  gameState = GAME_STATE.VERSUS;
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
  bestComboCount = 0;
  bestComboDamage = 0;
  hitEffects.length = 0;
  currentComboCount = 0;
  currentComboDamage = 0;
  updateHUD();
}

function goToTransition() {
  gameState = GAME_STATE.TRANSITION;
  transitionStartTime = performance.now();
}

function updateTransition(now) {
  const elapsed = now - transitionStartTime;
  if (elapsed >= TRANSITION_DURATION_MS) {
    startVersusMatch();
  }
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

