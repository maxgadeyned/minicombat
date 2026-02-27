"use strict";

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
  const currTop = fighter.pos.y - fighter.size.h / 2;
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

