"use strict";

const activeHitboxes = [];

function spawnAttackFor(attacker, owner, kind) {
  const config = kind === "heavy" ? HEAVY : LIGHT;
  const now = (arguments.length >= 4 && arguments[3] != null) ? arguments[3] : performance.now();
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
      const isPlayerDownHeavy = (owner === "player" && p1Held.fastFall) || (owner === "player2" && p2Held.fastFall);
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

function spawnAttack(kind, nowMs) { spawnAttackFor(player, "player", kind, nowMs); }

