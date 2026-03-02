"use strict";

function performPlayerSpecial() {
  const now = performance.now();
  if (now < (player.nextSpecialAt || 0)) return;
  const isAir = !player.onGround;
  const p1Keys = getP1Keybinds(gameState === GAME_STATE.VERSUS ? "local" : "solo");
  let input = "neutral";
  if (isAir) input = "air";
  else if (keys.has(p1Keys.fastFall)) input = "down";
  else if (keys.has(p1Keys.moveLeft) || keys.has(p1Keys.moveRight)) input = "right";
  performSpecialFor(player, "player", input, now);
}

function performPlayer2Special() {
  const now = performance.now();
  if (!player2 || now < (player2.nextSpecialAt || 0)) return;
  const isAir = !player2.onGround;
  let input = "neutral";
  if (isAir) input = "air";
  else if (keys.has(p2Keybinds.fastFall)) input = "down";
  else if (keys.has(p2Keybinds.moveLeft) || keys.has(p2Keybinds.moveRight)) input = "right";
  performSpecialFor(player2, "player2", input, now);
}

function performSpecialFor(fighter, owner, input, now) {
  const archetype = fighter.archetype || "archer";
  if (archetype === "archer") useArcherSpecial(fighter, owner, input, now);
  else if (archetype === "bruiser") useBruiserSpecial(fighter, owner, input, now);
  else if (archetype === "mage") useMageSpecial(fighter, owner, input, now);
}

function pushSpecialHitboxFrom(attacker, owner, now, config) {
  const dir = attacker.facing >= 0 ? 1 : -1;
  const w = config.w;
  const h = config.h;
  const facingOffsetX = (config.offsetXFacing || 0) * dir;
  const offsetX = (config.offsetX || 0) + (config.useFacing ? facingOffsetX : 0);
  const offsetY = config.offsetY || 0;
  const x = attacker.pos.x + offsetX - w / 2;
  const y = attacker.pos.y + offsetY - h / 2;
  const obj = {
    x,
    y,
    w,
    h,
    owner,
    kind: config.kind || "light",
    createdAt: now,
    dirY: config.dirY !== undefined ? config.dirY : -0.3,
    base: config.base,
    scaling: config.scaling,
    damage: config.damage,
    lifetimeMs: config.lifetimeMs,
    vx: config.vx || 0,
    vy: config.vy || 0,
    ignoreBlock: !!config.ignoreBlock,
  };
  if (config.style) obj.style = config.style;
  activeHitboxes.push(obj);
}

// ---------- ARCHER SPECIALS ----------

function useArcherSpecial(fighter, owner, input, now) {
  const dir = fighter.facing >= 0 ? 1 : -1;

  if (input === "air") {
    const baseX = fighter.pos.x + dir * (fighter.size.w * 0.5 + 30);
    const baseY = fighter.pos.y - fighter.size.h * 0.2;
    const count = 3;
    for (let i = 0; i < count; i++) {
      pushSpecialHitboxFrom(fighter, owner, now, {
        w: 20,
        h: 40,
        offsetX: baseX - fighter.pos.x,
        offsetY: baseY - fighter.pos.y + i * 26,
        kind: "light",
        base: 210,
        scaling: 1.7,
        damage: 5,
        dirY: 1,
        lifetimeMs: 220,
      });
    }
    fighter.nextSpecialAt = now + 900;
    return;
  }

  if (input === "left") {
    fighter.pos.x -= dir * 60;
    fighter.prevPos.x = fighter.pos.x;
    const speed = 900;
    pushSpecialHitboxFrom(fighter, owner, now, {
      w: 24,
      h: 16,
      offsetXFacing: fighter.size.w * 0.5 + 30,
      useFacing: true,
      kind: "light",
      base: 230,
      scaling: 1.8,
      damage: 6,
      dirY: 0,
      lifetimeMs: 650,
      vx: dir * speed,
      vy: 0,
    });
    fighter.nextSpecialAt = now + 800;
    return;
  }

  if (input === "down") {
    const TRAP_LIFETIME_MS = 5000;
    const hasActiveTrap = activeHitboxes.some(
      (hb) => hb.style === "trap" && hb.owner === owner && (now - hb.createdAt) < (hb.lifetimeMs || TRAP_LIFETIME_MS)
    );
    if (hasActiveTrap) {
      playSfx("blocked");
      hitEffects.push({ type: "text", text: "!", x: fighter.pos.x, y: fighter.pos.y - 48, createdAt: now, duration: 400 });
      return;
    }
    pushSpecialHitboxFrom(fighter, owner, now, {
      w: 90,
      h: 26,
      offsetXFacing: fighter.size.w * 0.7,
      useFacing: true,
      offsetY: fighter.size.h * 0.5 - 4,
      kind: "light",
      base: 230,
      scaling: 1.4,
      damage: 5,
      dirY: -0.05,
      lifetimeMs: TRAP_LIFETIME_MS,
      style: "trap",
    });
    fighter.nextSpecialAt = now + 400;
    return;
  }

  if (input === "right") {
    const speed = 1050;
    pushSpecialHitboxFrom(fighter, owner, now, {
      w: 30,
      h: 18,
      offsetXFacing: fighter.size.w * 0.5 + 38,
      useFacing: true,
      kind: "heavy",
      base: 360,
      scaling: 3.0,
      damage: 8,
      dirY: 0,
      lifetimeMs: 800,
      vx: dir * speed,
      vy: 0,
    });
    fighter.nextSpecialAt = now + 1300;
    return;
  }

  const speed = 900;
  pushSpecialHitboxFrom(fighter, owner, now, {
    w: 24,
    h: 16,
    offsetXFacing: fighter.size.w * 0.5 + 26,
    useFacing: true,
    kind: "light",
    base: 220,
    scaling: 1.6,
    damage: 6,
    dirY: 0,
    lifetimeMs: 650,
    vx: dir * speed,
    vy: 0,
  });
  fighter.nextSpecialAt = now + 500;
}

// ---------- BRUISER SPECIALS ----------

function useBruiserSpecial(fighter, owner, input, now) {
  const dir = fighter.facing >= 0 ? 1 : -1;

  if (input === "air") {
    pushSpecialHitboxFrom(fighter, owner, now, {
      w: 60,
      h: 50,
      offsetX: 0,
      offsetY: fighter.size.h * 0.5 + 20,
      kind: "heavy",
      base: 360,
      scaling: 2.7,
      damage: 7,
      dirY: 1,
      lifetimeMs: 180,
    });
    fighter.vel.y = Math.max(fighter.vel.y, 900);
    fighter.nextSpecialAt = now + 1100;
    return;
  }

  if (input === "left") {
    pushSpecialHitboxFrom(fighter, owner, now, {
      w: 70,
      h: 60,
      offsetXFacing: fighter.size.w * 0.2,
      useFacing: true,
      kind: "heavy",
      base: 320,
      scaling: 2.4,
      damage: 7,
      dirY: -0.1,
      lifetimeMs: 160,
    });
    fighter.nextSpecialAt = now + 900;
    return;
  }

  if (input === "down") {
    pushSpecialHitboxFrom(fighter, owner, now, {
      w: 90,
      h: 40,
      offsetXFacing: fighter.size.w * 0.6,
      useFacing: true,
      offsetY: fighter.size.h * 0.5 - 8,
      kind: "heavy",
      base: 340,
      scaling: 2.2,
      damage: 7,
      dirY: -0.25,
      lifetimeMs: 200,
    });
    fighter.nextSpecialAt = now + 1200;
    return;
  }

  if (input === "right") {
    pushSpecialHitboxFrom(fighter, owner, now, {
      w: 65,
      h: 70,
      offsetXFacing: fighter.size.w * 0.6,
      useFacing: true,
      kind: "heavy",
      base: 380,
      scaling: 2.8,
      damage: 8,
      dirY: -0.2,
      lifetimeMs: 120,
      ignoreBlock: true,
    });
    fighter.nextSpecialAt = now + 1500;
    return;
  }

  pushSpecialHitboxFrom(fighter, owner, now, {
    w: 60,
    h: 60,
    offsetXFacing: fighter.size.w * 0.5,
    useFacing: true,
    kind: "heavy",
    base: 300,
    scaling: 2.3,
    damage: 7,
    dirY: -0.15,
    lifetimeMs: 150,
  });
  fighter.nextSpecialAt = now + 800;
}

// ---------- MAGE SPECIALS ----------

function useMageSpecial(fighter, owner, input, now) {
  const dir = fighter.facing >= 0 ? 1 : -1;

  if (input === "air") {
    pushSpecialHitboxFrom(fighter, owner, now, {
      w: 90,
      h: 90,
      offsetX: 0,
      offsetY: -10,
      kind: "light",
      base: 260,
      scaling: 1.9,
      damage: 6,
      dirY: -0.1,
      lifetimeMs: 200,
    });
    fighter.nextSpecialAt = now + 1000;
    return;
  }

  if (input === "left") {
    const distance = 120;
    fighter.pos.x -= dir * distance;
    fighter.prevPos.x = fighter.pos.x;
    fighter.rollingUntil = now + 180;
    fighter.rollInvulnUntil = now + 140;
    fighter.nextSpecialAt = now + 900;
    return;
  }

  if (input === "down") {
    pushSpecialHitboxFrom(fighter, owner, now, {
      w: 80,
      h: 40,
      offsetX: 0,
      offsetY: fighter.size.h * 0.5 - 6,
      kind: "light",
      base: 260,
      scaling: 2.0,
      damage: 7,
      dirY: -0.15,
      lifetimeMs: 220,
    });
    fighter.nextSpecialAt = now + 1200;
    return;
  }

  if (input === "right") {
    pushSpecialHitboxFrom(fighter, owner, now, {
      w: 90,
      h: 40,
      offsetXFacing: fighter.size.w,
      useFacing: true,
      offsetY: -fighter.size.h * 0.2,
      kind: "light",
      base: 300,
      scaling: 2.1,
      damage: 8,
      dirY: -0.2,
      lifetimeMs: 160,
    });
    fighter.nextSpecialAt = now + 850;
    return;
  }

  const speed = 420;
  pushSpecialHitboxFrom(fighter, owner, now, {
    w: 28,
    h: 28,
    offsetXFacing: fighter.size.w * 0.5 + 22,
    useFacing: true,
    offsetY: -fighter.size.h * 0.3,
    kind: "light",
    base: 230,
    scaling: 1.4,
    damage: 6,
    dirY: 0,
    lifetimeMs: 1100,
    vx: dir * speed,
    vy: 0,
  });
  fighter.nextSpecialAt = now + 900;
}

