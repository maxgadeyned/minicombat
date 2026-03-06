"use strict";

function rectsOverlap(a, b) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

function getAABB(entity) {
  return { x: entity.pos.x - entity.size.w / 2, y: entity.pos.y - entity.size.h / 2, w: entity.size.w, h: entity.size.h };
}

function integrateFighter(fighter, dt, nowMs) {
  if (nowMs == null) nowMs = performance.now();

  if (fighter.respawnAt && nowMs < fighter.respawnAt) return;

  fighter.prevPos.x = fighter.pos.x;
  fighter.prevPos.y = fighter.pos.y;
  const fastFall = fighter.onGround ? false : (fighter === player2 ? !!p2Held.fastFall : !!p1Held.fastFall);
  const gravityMult = fastFall ? FAST_FALL_MULTIPLIER : 1;
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
    if ((fighter === player || fighter === player2) && prevBottom < plat.y) {
      playSfx("land");
      hitEffects.push({ type: "dust", x: fighter.pos.x, y: PLATFORM.y, createdAt: nowMs, duration: 220 });
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

function applyBlastZoneRespawn(fighter, isDummy, nowMs) {
  if (nowMs == null) nowMs = performance.now();
  // Do not process blast-zone KOs while the fighter is invulnerable (respawn grace).
  if (fighter.invulnUntil && nowMs < fighter.invulnUntil) return;

  const aabb = getAABB(fighter);
  const out = aabb.x + aabb.w < -BLAST_MARGIN || aabb.x > WORLD.width + BLAST_MARGIN || aabb.y > WORLD.height + BLAST_MARGIN || aabb.y + aabb.h < -BLAST_MARGIN;
  if (!out) return;
  // nowMs already computed above
  if (!roundOver) {
    koSlowmoUntil = Math.max(koSlowmoUntil || 0, nowMs + KO_SLOWMO_MS);
    koFlashUntil = Math.max(koFlashUntil || 0, nowMs + KO_FLASH_MS);
    playSfx("ko");
  }
  // Respawn at the center of the platform; they will fall in from above.
  const spawnX = PLATFORM.x + PLATFORM.width / 2;
  const spawnY = PLATFORM.y - fighter.size.h - 260;
  const respawnAt = nowMs + RESPAWN_DELAY_MS;

  if (fighter === player2) {
    player2Stocks = Math.max(0, player2Stocks - 1);
    if (player2Stocks <= 0) { roundOver = true; roundOverStartTime = performance.now(); roundOverWinner = player; if (gameState === GAME_STATE.VERSUS) roundOverSelection = 0; }
    fighter.pos.x = spawnX; fighter.pos.y = spawnY;
    fighter.prevPos.x = spawnX; fighter.prevPos.y = spawnY;
    fighter.vel.x = 0; fighter.vel.y = 0; fighter.damage = 0;
    fighter.jumpsRemaining = 2; fighter.lastJumpWasDouble = false;
    fighter.respawnAt = respawnAt;
    fighter.invulnUntil = respawnAt + RESPAWN_INVULN_MS;
    fighter.onGround = false;
    // Clear all status timers so control is fully restored after respawn.
    fighter.stunnedUntil = nowMs;
    fighter.parryWindowUntil = 0;
    fighter.parryLockoutUntil = 0;
    fighter.rollingUntil = 0;
    fighter.rollInvulnUntil = 0;
    updateHUD();
  } else if (isDummy) {
    dummyStocks = Math.max(0, dummyStocks - 1);
    if (dummyStocks <= 0) { roundOver = true; roundOverStartTime = performance.now(); roundOverWinner = player; if (gameState === GAME_STATE.VERSUS) roundOverSelection = 0; }
    fighter.pos.x = spawnX; fighter.pos.y = spawnY;
    fighter.prevPos.x = spawnX; fighter.prevPos.y = spawnY;
    fighter.vel.x = 0; fighter.vel.y = 0; fighter.damage = 0;
    fighter.jumpsRemaining = 2; fighter.lastJumpWasDouble = false;
    fighter.respawnAt = respawnAt;
    fighter.invulnUntil = respawnAt + RESPAWN_INVULN_MS;
    fighter.onGround = false;
    fighter.stunnedUntil = nowMs;
    fighter.parryWindowUntil = 0;
    fighter.parryLockoutUntil = 0;
    fighter.rollingUntil = 0;
    fighter.rollInvulnUntil = 0;
    updateHUD();
  } else {
    playerStocks = Math.max(0, playerStocks - 1);
    if (playerStocks <= 0) { roundOver = true; roundOverStartTime = performance.now(); roundOverWinner = gameState === GAME_STATE.VERSUS ? player2 : dummy; if (gameState === GAME_STATE.VERSUS) roundOverSelection = 0; }
    fighter.pos.x = spawnX; fighter.pos.y = spawnY;
    fighter.prevPos.x = spawnX; fighter.prevPos.y = spawnY;
    fighter.vel.x = 0; fighter.vel.y = 0; fighter.jumpsRemaining = 2; fighter.damage = 0;
    fighter.lastJumpWasDouble = false;
    fighter.respawnAt = respawnAt;
    fighter.invulnUntil = respawnAt + RESPAWN_INVULN_MS;
    fighter.onGround = false;
    fighter.stunnedUntil = nowMs;
    fighter.parryWindowUntil = 0;
    fighter.parryLockoutUntil = 0;
    fighter.rollingUntil = 0;
    fighter.rollInvulnUntil = 0;
    updateHUD();
  }
}

function resolvePlayerDummyCollision() {
  const opponent = gameState === GAME_STATE.VERSUS ? player2 : dummy;
  const a = getAABB(player), b = getAABB(opponent);
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (overlapX > 0 && overlapY > 0) {
    const push = overlapX;
    if (player.pos.x < opponent.pos.x) { player.pos.x -= push * 0.9; opponent.pos.x += push * 0.1; }
    else { player.pos.x += push * 0.9; opponent.pos.x -= push * 0.1; }
    opponent.vel.x += player.vel.x * 0.1;
    player.vel.x *= 0.6;
  }
  if (gameState === GAME_STATE.VERSUS && player2) {
    const a2 = getAABB(player2), b2 = getAABB(player);
    const overlapX2 = Math.min(a2.x + a2.w, b2.x + b2.w) - Math.max(a2.x, b2.x);
    const overlapY2 = Math.min(a2.y + a2.h, b2.y + b2.h) - Math.max(a2.y, b2.y);
    if (overlapX2 > 0 && overlapY2 > 0) {
      const push2 = overlapX2;
      if (player2.pos.x < player.pos.x) { player2.pos.x -= push2 * 0.9; player.pos.x += push2 * 0.1; }
      else { player2.pos.x += push2 * 0.9; player.pos.x -= push2 * 0.1; }
      player.vel.x += player2.vel.x * 0.1;
      player2.vel.x *= 0.6;
    }
  }
}

if (typeof global !== "undefined") {
  global.getAABB = getAABB;
  global.rectsOverlap = rectsOverlap;
  global.integrateFighter = integrateFighter;
  global.applyBlastZoneRespawn = applyBlastZoneRespawn;
  global.resolvePlayerDummyCollision = resolvePlayerDummyCollision;
}

