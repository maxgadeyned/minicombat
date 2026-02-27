"use strict";

let playerStocks = MAX_STOCKS, dummyStocks = MAX_STOCKS, roundOver = false;
let roundTimeRemaining = ROUND_TIME_SEC;
let bestComboCount = 0, bestComboDamage = 0;
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

      if (attacker === player && victim === dummy && !victim.blocking && !isParry && damageToApply > 0) {
        if (now - lastComboHitTime > COMBO_RESET_MS) { currentComboCount = 1; currentComboDamage = damageToApply; }
        else { currentComboCount += 1; currentComboDamage += damageToApply; }
        lastComboHitTime = now;
        if (currentComboCount > bestComboCount) { bestComboCount = currentComboCount; bestComboDamage = currentComboDamage; }
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

    if (hb.owner === "player" && rectsOverlap(hbBox, dummyBox)) applyHit(dummy, player);
    else if (hb.owner === "dummy" && rectsOverlap(hbBox, playerBox)) applyHit(player, dummy);
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
  roundTimeRemaining = ROUND_TIME_SEC;
  bestComboCount = 0;
  bestComboDamage = 0;
  hitEffects.length = 0;
  currentComboCount = 0;
  currentComboDamage = 0;
  updateHUD();
}

