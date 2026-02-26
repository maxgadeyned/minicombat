"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const dummyDamageLabel = document.getElementById("dummyDamage");
const playerDamageLabel = document.getElementById("playerDamage");

// ---------- CONFIG ----------
const WORLD = { width: canvas.width, height: canvas.height };

const PLATFORM = { width: 720, height: 24 };
PLATFORM.x = (WORLD.width - PLATFORM.width) / 2;
PLATFORM.y = WORLD.height * 0.7;

const GRAVITY = 2200;
const FAST_FALL_MULTIPLIER = 2.6;
const MOVE_SPEED = 480;
const FIRST_JUMP_VELOCITY = -1200;
const DOUBLE_JUMP_VELOCITY = -900;
const HORIZONTAL_DAMPING = 18;
const BLAST_MARGIN = 200;

const ATTACK_LIFETIME_MS = 100;
const LIGHT = { base: 260, scaling: 2.0, damage: 5 };
const HEAVY = { base: 380, scaling: 3.0, damage: 12 };

const BLOCK_DAMAGE_MULT = 0.35;
const BLOCK_KNOCKBACK_MULT = 0.45;
const PARRY_WINDOW_MS = 80;
const PARRY_LOCKOUT_MS = 350;
const PARRY_KNOCKBACK_MULT = 0.1;
const BLOCKSTUN_LIGHT_MS = 110;
const BLOCKSTUN_HEAVY_MS = 180;
const HITSTUN_LIGHT_MS = 130;
const HITSTUN_HEAVY_MS = 200;
const PARRY_STUN_ATTACKER_MS = 220;
const LIGHT_COOLDOWN_MS = 160;
const HEAVY_COOLDOWN_MS = 320;
const SHORT_HOP_MAX_MS = 120;
const SHORT_HOP_MULT = 0.65;
const DASH_SPEED = 900;
const ROLL_DURATION_MS = 220;

const MAX_STOCKS = 3;

const HITSTOP_LIGHT_MS = 40;
const HITSTOP_HEAVY_MS = 70;
const HITSTOP_BLOCK_LIGHT_MS = 20;
const HITSTOP_BLOCK_HEAVY_MS = 40;
const HITSTOP_PARRY_MS = 100;
const SHAKE_LIGHT = 3;
const SHAKE_HEAVY = 6;
const SHAKE_PARRY = 4;
const KO_SLOWMO_MS = 650;
const KO_SLOWMO_SCALE = 0.35;
const KO_FLASH_MS = 180;

// ---------- INPUT ----------
const keys = new Set();
let spaceHeld = false;
let jumpPressed = false;
let blockKeyJustPressed = false;
let dashPressed = false;
let lastJumpPressAt = 0;

window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === "Space") {
    lastJumpPressAt = performance.now();
    if (!spaceHeld) jumpPressed = true;
    spaceHeld = true;
  }
  if (e.code === "KeyL") { blockKeyJustPressed = true; player.blocking = true; }
  if (e.code === "KeyW") dashPressed = true;
  if (e.code === "KeyC") applyPlayerType(playerTypeIndex + 1);
  if (e.code === "KeyJ") spawnAttack("light");
  else if (e.code === "KeyK") spawnAttack("heavy");
  else if (e.code === "KeyT") dummyMode = (dummyMode + 1) % DUMMY_MODE_LABELS.length;
  else if (e.code === "KeyR") hardReset();
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "Space") {
    spaceHeld = false;
    if (!player.lastJumpWasDouble && player.vel.y < 0) player.vel.y *= 0.5;
  }
  if (e.code === "KeyL") player.blocking = false;
});

// ---------- ENTITIES ----------
function createFighter(options) {
  return {
    pos: { x: options.x, y: options.y },
    prevPos: { x: options.x, y: options.y },
    vel: { x: 0, y: 0 },
    size: { w: options.w, h: options.h },
    color: options.color,
    onGround: false,
    facing: 1,
    damage: 0,
    jumpsRemaining: 2,
    blocking: false,
    parryWindowUntil: 0,
    parryLockoutUntil: 0,
    stunnedUntil: 0,
    parryFlashUntil: 0,
    nextLightAt: 0,
    nextHeavyAt: 0,
    rollingUntil: 0,
    rollInvulnUntil: 0,
    lastJumpWasDouble: false,
    moveSpeed: options.moveSpeed || MOVE_SPEED,
    firstJumpVel: options.firstJumpVel || FIRST_JUMP_VELOCITY,
    doubleJumpVel: options.doubleJumpVel || DOUBLE_JUMP_VELOCITY,
    weight: options.weight || 1.0,
    name: options.name || "Balanced",
  };
}

const playerStart = { x: WORLD.width * 0.3, y: PLATFORM.y - 60 };
const dummyStart = { x: WORLD.width * 0.7, y: PLATFORM.y - 60 };

let player = createFighter({ x: playerStart.x, y: playerStart.y, w: 40, h: 70, color: "#3da1ff" });
let dummy = createFighter({
  x: dummyStart.x, y: dummyStart.y, w: 40, h: 80, color: "#ff4b5c",
  name: "Training Dummy", moveSpeed: MOVE_SPEED * 0.9,
  firstJumpVel: FIRST_JUMP_VELOCITY * 0.9, doubleJumpVel: DOUBLE_JUMP_VELOCITY * 0.9, weight: 1.2,
});
dummy.isDummy = true;

let playerTypeIndex = 0;
const PLAYER_TYPES = [
  { label: "Balanced", moveSpeed: MOVE_SPEED, firstJumpVel: FIRST_JUMP_VELOCITY, doubleJumpVel: DOUBLE_JUMP_VELOCITY, weight: 1.0 },
  { label: "Light", moveSpeed: MOVE_SPEED * 1.15, firstJumpVel: FIRST_JUMP_VELOCITY * 1.1, doubleJumpVel: DOUBLE_JUMP_VELOCITY * 1.05, weight: 0.85 },
  { label: "Heavy", moveSpeed: MOVE_SPEED * 0.85, firstJumpVel: FIRST_JUMP_VELOCITY * 0.9, doubleJumpVel: DOUBLE_JUMP_VELOCITY * 0.9, weight: 1.25 },
];

function applyPlayerType(index) {
  playerTypeIndex = index % PLAYER_TYPES.length;
  const type = PLAYER_TYPES[playerTypeIndex];
  player.moveSpeed = type.moveSpeed;
  player.firstJumpVel = type.firstJumpVel;
  player.doubleJumpVel = type.doubleJumpVel;
  player.weight = type.weight;
  player.name = type.label;
}

let currentComboCount = 0;
let lastComboHitTime = 0;
let currentComboDamage = 0;
const COMBO_RESET_MS = 900;

let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; }
}

function playSfx(type) {
  if (!audioCtx) ensureAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  let freq = 440, duration = 0.08;
  switch (type) {
    case "hitLight": freq = 500; duration = 0.09; break;
    case "hitHeavy": freq = 260; duration = 0.13; break;
    case "block": freq = 320; duration = 0.06; break;
    case "parry": freq = 800; duration = 0.14; break;
    case "jump": freq = 600; duration = 0.07; break;
    case "land": freq = 220; duration = 0.08; break;
    default: break;
  }
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

// ---------- ATTACKS ----------
const activeHitboxes = [];

function spawnAttackFor(attacker, owner, kind) {
  const config = kind === "heavy" ? HEAVY : LIGHT;
  const now = performance.now();
  if (now < attacker.stunnedUntil) return;
  if (kind === "light" && now < attacker.nextLightAt) return;
  if (kind === "heavy" && now < attacker.nextHeavyAt) return;

  const dir = attacker.facing >= 0 ? 1 : -1;
  let w, h, offsetX, offsetY, dirY;

  if (attacker.onGround) {
    if (kind === "light") { w = 60; h = 40; offsetX = attacker.size.w / 2 + w / 2 + 4; offsetY = -attacker.size.h * 0.15; dirY = -0.3; }
    else { w = 90; h = 55; offsetX = attacker.size.w / 2 + w / 2 + 8; offsetY = -attacker.size.h * 0.2; dirY = -0.5; }
  } else {
    if (kind === "light") { w = 70; h = 40; offsetX = attacker.size.w / 2 + w / 2 + 4; offsetY = 0; dirY = -0.1; }
    else {
      const isPlayerDownHeavy = owner === "player" && keys.has("KeyS");
      if (isPlayerDownHeavy) { w = 55; h = 50; offsetX = 0; offsetY = attacker.size.h / 2 + h / 2 + 4; dirY = 1; }
      else { w = 75; h = 45; offsetX = attacker.size.w / 2 + w / 2 + 4; offsetY = -attacker.size.h * 0.1; dirY = -0.35; }
    }
  }

  const x = attacker.pos.x + dir * offsetX - w / 2;
  const y = attacker.pos.y + offsetY - h / 2;
  activeHitboxes.push({
    x, y, w, h, owner, kind, createdAt: now, dirY,
    base: config.base, scaling: config.scaling, damage: config.damage,
  });
  if (kind === "light") attacker.nextLightAt = now + LIGHT_COOLDOWN_MS;
  else attacker.nextHeavyAt = now + HEAVY_COOLDOWN_MS;
}

function spawnAttack(kind) { spawnAttackFor(player, "player", kind); }

// ---------- PHYSICS ----------
function rectsOverlap(a, b) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

function getAABB(entity) {
  return { x: entity.pos.x - entity.size.w / 2, y: entity.pos.y - entity.size.h / 2, w: entity.size.w, h: entity.size.h };
}

function integrateFighter(fighter, dt) {
  const nowMs = performance.now();

  fighter.prevPos.x = fighter.pos.x;
  fighter.prevPos.y = fighter.pos.y;
  const gravityMult = !fighter.onGround && keys.has("KeyS") ? FAST_FALL_MULTIPLIER : 1;
  fighter.vel.y += GRAVITY * gravityMult * dt;
  fighter.pos.x += fighter.vel.x * dt;
  fighter.pos.y += fighter.vel.y * dt;
  fighter.onGround = false;

  const aabb = getAABB(fighter);
  const plat = { x: PLATFORM.x, y: PLATFORM.y, w: PLATFORM.width, h: PLATFORM.height };
  const prevBottom = fighter.prevPos.y + fighter.size.h / 2;
  const currBottom = fighter.pos.y + fighter.size.h / 2;
  const prevTop = fighter.prevPos.y - fighter.size.h / 2;
  const platBottom = PLATFORM.y + PLATFORM.height;
  const horizontalOverlap = aabb.x + aabb.w > plat.x && aabb.x < plat.x + plat.w;

  if (horizontalOverlap && prevBottom <= plat.y && currBottom >= plat.y && fighter.vel.y >= 0) {
    fighter.pos.y = PLATFORM.y - fighter.size.h / 2;
    fighter.vel.y = 0;
    if (fighter.isDummy) fighter.vel.x = 0;
    fighter.onGround = true;
    fighter.jumpsRemaining = 2;
    fighter.lastJumpWasDouble = false;
    if (fighter === player && prevBottom < plat.y) {
      playSfx("land");
      hitEffects.push({ type: "dust", x: fighter.pos.x, y: PLATFORM.y, createdAt: performance.now(), duration: 220 });
    }
  }

  // Only stop head-bump when moving up into the platform from below. If the fighter's center
  // is already below the platform bottom, never run this so they can fall and die.
  const centerBelowPlatform = fighter.pos.y > platBottom;
  if (
    !centerBelowPlatform &&
    horizontalOverlap &&
    prevTop >= platBottom &&
    currTop <= platBottom &&
    fighter.vel.y < 0
  ) {
    fighter.pos.y = platBottom + fighter.size.h / 2;
    fighter.vel.y = 0;
  }
}

function applyBlastZoneRespawn(fighter, isDummy) {
  const aabb = getAABB(fighter);
  const out = aabb.x + aabb.w < -BLAST_MARGIN || aabb.x > WORLD.width + BLAST_MARGIN || aabb.y > WORLD.height + BLAST_MARGIN || aabb.y + aabb.h < -BLAST_MARGIN;
  if (!out) return;
  const nowMs = performance.now();
  if (!roundOver) {
    koSlowmoUntil = Math.max(koSlowmoUntil || 0, nowMs + KO_SLOWMO_MS);
    koFlashUntil = Math.max(koFlashUntil || 0, nowMs + KO_FLASH_MS);
    shakeUntil = Math.max(shakeUntil, nowMs + 280);
    shakeMagnitude = Math.max(shakeMagnitude, SHAKE_HEAVY * 1.25);
  }
  if (isDummy) {
    dummyStocks = Math.max(0, dummyStocks - 1);
    if (dummyStocks <= 0) roundOver = true;
    fighter.pos.x = dummyStart.x; fighter.pos.y = dummyStart.y;
    fighter.prevPos.x = dummyStart.x; fighter.prevPos.y = dummyStart.y;
    fighter.vel.x = 0; fighter.vel.y = 0; fighter.damage = 0;
    fighter.jumpsRemaining = 2; fighter.lastJumpWasDouble = false;
    updateHUD();
  } else {
    playerStocks = Math.max(0, playerStocks - 1);
    if (playerStocks <= 0) roundOver = true;
    fighter.pos.x = playerStart.x; fighter.pos.y = playerStart.y;
    fighter.prevPos.x = playerStart.x; fighter.prevPos.y = playerStart.y;
    fighter.vel.x = 0; fighter.vel.y = 0; fighter.jumpsRemaining = 2; fighter.damage = 0;
    fighter.lastJumpWasDouble = false;
    updateHUD();
  }
}

// ---------- GAME LOGIC ----------
let playerStocks = MAX_STOCKS, dummyStocks = MAX_STOCKS, roundOver = false;
const DUMMY_MODE_LABELS = ["PASSIVE", "ATTACK", "PARRY TRAIN"];
let dummyMode = 1;
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

function handleDummyAI(now) {
  if (roundOver || dummyMode === 0 || now < dummyNextAttackAt) return;
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
  const playerBox = getAABB(player);
  const dummyBox = getAABB(dummy);

  for (let i = activeHitboxes.length - 1; i >= 0; i--) {
    const hb = activeHitboxes[i];
    if (now - hb.createdAt > ATTACK_LIFETIME_MS) { activeHitboxes.splice(i, 1); continue; }
    const hbBox = { x: hb.x, y: hb.y, w: hb.w, h: hb.h };

    const applyHit = (victim, attacker) => {
      const isLight = hb.kind === "light";
      const canBlock = victim.onGround && victim.blocking;
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
        playSfx(isLight ? "hitLight" : "hitHeavy");
      }

      victim.damage += damageToApply;
      updateHUD();

      if (attacker === player && victim === dummy && !victim.blocking && !isParry && damageToApply > 0) {
        if (now - lastComboHitTime > COMBO_RESET_MS) { currentComboCount = 1; currentComboDamage = damageToApply; }
        else { currentComboCount += 1; currentComboDamage += damageToApply; }
        lastComboHitTime = now;
      }

      const knockbackMagnitude = (hb.base + victim.damage * hb.scaling) * knockbackMult / victim.weight;
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

    if (hb.owner === "player" && rectsOverlap(hbBox, dummyBox)) applyHit(dummy, player);
    else if (hb.owner === "dummy" && rectsOverlap(hbBox, playerBox)) applyHit(player, dummy);
  }
}

function resolvePlayerDummyCollision() {
  const a = getAABB(player), b = getAABB(dummy);
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (overlapX > 0 && overlapY > 0) {
    const push = overlapX;
    if (player.pos.x < dummy.pos.x) { player.pos.x -= push * 0.9; dummy.pos.x += push * 0.1; }
    else { player.pos.x += push * 0.9; dummy.pos.x -= push * 0.1; }
    dummy.vel.x += player.vel.x * 0.1;
    player.vel.x *= 0.6;
  }
}

function updateHUD() {
  const d = Math.round(dummy.damage), p = Math.round(player.damage);
  dummyDamageLabel.textContent = `${d}%`;
  playerDamageLabel.textContent = `${p}%`;
  function colorForDamage(val) {
    if (val < 60) return "#9dffde";
    if (val < 120) return "#ffe28a";
    return "#ff6b6b";
  }
  dummyDamageLabel.style.color = colorForDamage(d);
  playerDamageLabel.style.color = colorForDamage(p);
}

function hardReset() {
  player = createFighter({ x: playerStart.x, y: playerStart.y, w: 40, h: 70, color: "#3da1ff" });
  applyPlayerType(playerTypeIndex);
  dummy = createFighter({
    x: dummyStart.x, y: dummyStart.y, w: 40, h: 80, color: "#ff4b5c",
    name: "Training Dummy", moveSpeed: MOVE_SPEED * 0.9,
    firstJumpVel: FIRST_JUMP_VELOCITY * 0.9, doubleJumpVel: DOUBLE_JUMP_VELOCITY * 0.9, weight: 1.2,
  });
  dummy.isDummy = true;
  activeHitboxes.length = 0;
  playerStocks = MAX_STOCKS;
  dummyStocks = MAX_STOCKS;
  roundOver = false;
  hitEffects.length = 0;
  currentComboCount = 0;
  currentComboDamage = 0;
  updateHUD();
}

// ---------- RENDERING ----------
function clear() { ctx.clearRect(0, 0, WORLD.width, WORLD.height); }

function drawPlatform() {
  const gradient = ctx.createLinearGradient(PLATFORM.x, PLATFORM.y, PLATFORM.x, PLATFORM.y + PLATFORM.height);
  gradient.addColorStop(0, "#3d3d4f");
  gradient.addColorStop(1, "#1b1b25");
  ctx.fillStyle = gradient;
  ctx.fillRect(PLATFORM.x, PLATFORM.y, PLATFORM.width, PLATFORM.height);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(PLATFORM.x, PLATFORM.y, PLATFORM.width, 2);
}

function drawEntity(fighter) {
  const aabb = getAABB(fighter);
  ctx.save();
  if (fighter === player && fighter.rollInvulnUntil && performance.now() < fighter.rollInvulnUntil) ctx.globalAlpha = 0.4;
  if (fighter.parryFlashUntil && performance.now() < fighter.parryFlashUntil) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#fff";
    ctx.fillRect(aabb.x - 2, aabb.y - 2, aabb.w + 4, aabb.h + 4);
  }
  ctx.fillStyle = fighter.color;
  ctx.fillRect(aabb.x, aabb.y, aabb.w, aabb.h);
  ctx.restore();
}

function drawHitboxes(now) {
  ctx.save();
  for (const hb of activeHitboxes) {
    const age = now - hb.createdAt;
    if (age > ATTACK_LIFETIME_MS) continue;
    const alpha = Math.max(0, 1 - age / ATTACK_LIFETIME_MS);
    ctx.globalAlpha = 0.2 + 0.3 * alpha;
    ctx.fillStyle = hb.kind === "heavy" ? "#ffb347" : "#6bffb5";
    ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
  }
  ctx.restore();
}

function drawEffects(now) {
  const remaining = [];
  for (const effect of hitEffects) {
    const age = now - effect.createdAt;
    if (age > effect.duration) continue;
    const t = age / effect.duration;
    if (effect.type === "spark") {
      ctx.save();
      ctx.globalAlpha = 1 - t;
      const radius = effect.isHeavy ? 22 : 16;
      ctx.fillStyle = effect.isHeavy ? "#ffeb99" : "#9dffde";
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius * (0.6 + 0.4 * (1 - t)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (effect.type === "text") {
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = "#adff2f";
      ctx.font = "bold 22px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(effect.text, effect.x, effect.y - 10 * (1 - t));
      ctx.restore();
    } else if (effect.type === "arrow") {
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.translate(effect.x, effect.y);
      ctx.rotate(effect.angle);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(26, 0);
      ctx.lineTo(20, -5);
      ctx.moveTo(26, 0);
      ctx.lineTo(20, 5);
      ctx.stroke();
      ctx.restore();
    } else if (effect.type === "dust") {
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.7;
      ctx.fillStyle = "rgba(200,200,220,0.9)";
      ctx.beginPath();
      ctx.ellipse(effect.x, effect.y + 2, 30 * (0.5 + 0.5 * t), 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    remaining.push(effect);
  }
  hitEffects.length = 0;
  for (const e of remaining) hitEffects.push(e);
}

function draw(now) {
  clear();
  ctx.save();
  if (now < shakeUntil && shakeMagnitude > 0) {
    const ox = (Math.random() * 2 - 1) * shakeMagnitude;
    const oy = (Math.random() * 2 - 1) * shakeMagnitude;
    ctx.translate(ox, oy);
  }
  const horizonY = WORLD.height * 0.55;
  const grad = ctx.createLinearGradient(0, horizonY, 0, WORLD.height);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.8)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, horizonY, WORLD.width, WORLD.height - horizonY);
  drawPlatform();
  drawEntity(player);
  drawEntity(dummy);
  drawHitboxes(now);
  drawEffects(now);
  ctx.restore();
  if (now < koFlashUntil) {
    const remaining = koFlashUntil - now;
    const alpha = Math.max(0, Math.min(1, remaining / KO_FLASH_MS));
    ctx.save();
    ctx.fillStyle = `rgba(255,255,255,${0.7 * alpha})`;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.restore();
  }
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "12px system-ui";
  ctx.textAlign = "left";
  const playerState = now < player.stunnedUntil ? "HITSTUN" : now < player.rollingUntil ? "ROLL" : player.blocking ? "BLOCK" : player.onGround ? "GROUND" : "AIR";
  ctx.fillText(`P%: ${Math.round(player.damage)}  Stocks: ${playerStocks}  State: ${playerState}`, 12, 20);
  ctx.fillText(`D%: ${Math.round(dummy.damage)}  Stocks: ${dummyStocks}  Dummy: ${dummy.onGround ? "GROUND" : "AIR"}`, 12, 36);
  ctx.fillText(`Dummy Mode (T): ${DUMMY_MODE_LABELS[dummyMode]}`, 12, 52);
  if (currentComboCount > 1 && now - lastComboHitTime <= COMBO_RESET_MS) {
    ctx.textAlign = "right";
    ctx.font = "bold 14px system-ui";
    ctx.fillText(`${currentComboCount} HIT  /  ${Math.round(currentComboDamage)}%`, WORLD.width - 16, 24);
  }
  if (roundOver) {
    ctx.textAlign = "center";
    ctx.font = "bold 32px system-ui";
    const winner = playerStocks > 0 && dummyStocks <= 0 ? "PLAYER WINS" : dummyStocks > 0 && playerStocks <= 0 ? "DUMMY WINS" : "ROUND OVER";
    ctx.fillText(winner, WORLD.width / 2, WORLD.height / 2 - 20);
    ctx.font = "16px system-ui";
    ctx.fillText("Press R to reset", WORLD.width / 2, WORLD.height / 2 + 10);
  }
  ctx.restore();
}

let lastTime = performance.now();
function loop(now) {
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  let dt = Math.min(rawDt, 1 / 30);
  if (now < koSlowmoUntil) dt *= KO_SLOWMO_SCALE;
  if (!roundOver) {
    handlePlayerInput(dt, now);
    integrateFighter(player, dt);
    integrateFighter(dummy, dt);
    resolvePlayerDummyCollision();
    applyBlastZoneRespawn(dummy, true);
    applyBlastZoneRespawn(player, false);
    handleCombat(dt, now);
    handleDummyAI(now);
  }
  draw(now);
  requestAnimationFrame(loop);
}

updateHUD();
requestAnimationFrame(loop);
