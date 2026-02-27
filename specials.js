"use strict";

function performPlayerSpecial() {
  const now = performance.now();
  if (now < (player.nextSpecialAt || 0)) return;

  const isAir = !player.onGround;
  let input = "neutral";
  if (isAir) input = "air";
  else if (keys.has("KeyS")) input = "down";
  else if (keys.has("KeyA") || keys.has("KeyD")) input = "right";

  const archetype = player.archetype || "archer";
  if (archetype === "archer") {
    useArcherSpecial(input, now);
  } else if (archetype === "bruiser") {
    useBruiserSpecial(input, now);
  } else if (archetype === "mage") {
    useMageSpecial(input, now);
  }
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

function useArcherSpecial(input, now) {
  const dir = player.facing >= 0 ? 1 : -1;

  if (input === "air") {
    // Rain of Arrows: short vertical spread in front of the player while airborne.
    const baseX = player.pos.x + dir * (player.size.w * 0.5 + 30);
    const baseY = player.pos.y - player.size.h * 0.2;
    const count = 3;
    for (let i = 0; i < count; i++) {
      pushSpecialHitboxFrom(player, "player", now, {
        w: 20,
        h: 40,
        offsetX: baseX - player.pos.x,
        offsetY: baseY - player.pos.y + i * 26,
        kind: "light",
        base: 210,
        scaling: 1.7,
        damage: 3,
        dirY: 1,
        lifetimeMs: 220,
      });
    }
    player.nextSpecialAt = now + 900;
    return;
  }

  if (input === "left") {
    // Backstep Shot: small hop backward plus quick arrow.
    player.pos.x -= dir * 60;
    player.prevPos.x = player.pos.x;
    const speed = 900;
    pushSpecialHitboxFrom(player, "player", now, {
      w: 24,
      h: 16,
      offsetXFacing: player.size.w * 0.5 + 30,
      useFacing: true,
      kind: "light",
      base: 230,
      scaling: 1.8,
      damage: 4,
      dirY: 0,
      lifetimeMs: 650,
      vx: dir * speed,
      vy: 0,
    });
    player.nextSpecialAt = now + 800;
    return;
  }

  if (input === "down") {
    // Grounded Trap: one at a time, lasts 5s. Can't place another until it expires.
    const TRAP_LIFETIME_MS = 5000;
    const hasActiveTrap = activeHitboxes.some(
      (hb) => hb.style === "trap" && hb.owner === "player" && (now - hb.createdAt) < (hb.lifetimeMs || TRAP_LIFETIME_MS)
    );
    if (hasActiveTrap) {
      playSfx("blocked");
      hitEffects.push({ type: "text", text: "!", x: player.pos.x, y: player.pos.y - 48, createdAt: now, duration: 400 });
      return;
    }
    pushSpecialHitboxFrom(player, "player", now, {
      w: 90,
      h: 26,
      offsetXFacing: player.size.w * 0.7,
      useFacing: true,
      offsetY: player.size.h * 0.5 - 4,
      kind: "light",
      base: 230,
      scaling: 1.4,
      damage: 3,
      dirY: -0.05,
      lifetimeMs: TRAP_LIFETIME_MS,
      style: "trap",
    });
    player.nextSpecialAt = now + 400;
    return;
  }

  if (input === "right") {
    // Power Shot: slower, stronger arrow.
    const speed = 1050;
    pushSpecialHitboxFrom(player, "player", now, {
      w: 30,
      h: 18,
      offsetXFacing: player.size.w * 0.5 + 38,
      useFacing: true,
      kind: "heavy",
      base: 360,
      scaling: 3.0,
      damage: 10,
      dirY: 0,
      lifetimeMs: 800,
      vx: dir * speed,
      vy: 0,
    });
    player.nextSpecialAt = now + 1300;
    return;
  }

  // Neutral quick shot.
  const speed = 900;
  pushSpecialHitboxFrom(player, "player", now, {
    w: 24,
    h: 16,
    offsetXFacing: player.size.w * 0.5 + 26,
    useFacing: true,
    kind: "light",
    base: 220,
    scaling: 1.6,
    damage: 4,
    dirY: 0,
    lifetimeMs: 650,
    vx: dir * speed,
    vy: 0,
  });
  player.nextSpecialAt = now + 500;
}

// ---------- BRUISER SPECIALS ----------

function useBruiserSpecial(input, now) {
  const dir = player.facing >= 0 ? 1 : -1;

  if (input === "air") {
    // Divebomb: strong downward slam.
    pushSpecialHitboxFrom(player, "player", now, {
      w: 60,
      h: 50,
      offsetX: 0,
      offsetY: player.size.h * 0.5 + 20,
      kind: "heavy",
      base: 360,
      scaling: 2.7,
      damage: 11,
      dirY: 1,
      lifetimeMs: 180,
    });
    player.vel.y = Math.max(player.vel.y, 900);
    player.nextSpecialAt = now + 1100;
    return;
  }

  if (input === "left") {
    // Reversal Shoulder: quick close-range hit slightly behind then in front.
    pushSpecialHitboxFrom(player, "player", now, {
      w: 70,
      h: 60,
      offsetXFacing: player.size.w * 0.2,
      useFacing: true,
      kind: "heavy",
      base: 320,
      scaling: 2.4,
      damage: 9,
      dirY: -0.1,
      lifetimeMs: 160,
    });
    player.nextSpecialAt = now + 900;
    return;
  }

  if (input === "down") {
    // Ground Slam: small quake in front.
    pushSpecialHitboxFrom(player, "player", now, {
      w: 90,
      h: 40,
      offsetXFacing: player.size.w * 0.6,
      useFacing: true,
      offsetY: player.size.h * 0.5 - 8,
      kind: "heavy",
      base: 340,
      scaling: 2.2,
      damage: 10,
      dirY: -0.25,
      lifetimeMs: 200,
    });
    player.nextSpecialAt = now + 1200;
    return;
  }

  if (input === "right") {
    // Command Grab: ignores block, short-range.
    pushSpecialHitboxFrom(player, "player", now, {
      w: 65,
      h: 70,
      offsetXFacing: player.size.w * 0.6,
      useFacing: true,
      kind: "heavy",
      base: 380,
      scaling: 2.8,
      damage: 14,
      dirY: -0.2,
      lifetimeMs: 120,
      ignoreBlock: true,
    });
    player.nextSpecialAt = now + 1500;
    return;
  }

  // Neutral Armor Jab (just a strong body blow for now).
  pushSpecialHitboxFrom(player, "player", now, {
    w: 60,
    h: 60,
    offsetXFacing: player.size.w * 0.5,
    useFacing: true,
    kind: "heavy",
    base: 300,
    scaling: 2.3,
    damage: 9,
    dirY: -0.15,
    lifetimeMs: 150,
  });
  player.nextSpecialAt = now + 800;
}

// ---------- MAGE SPECIALS ----------

function useMageSpecial(input, now) {
  const dir = player.facing >= 0 ? 1 : -1;

  if (input === "air") {
    // Aerial Surge: small burst around the player.
    pushSpecialHitboxFrom(player, "player", now, {
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
    player.nextSpecialAt = now + 1000;
    return;
  }

  if (input === "left") {
    // Blink Back: short teleport backwards with brief invuln.
    const distance = 120;
    player.pos.x -= dir * distance;
    player.prevPos.x = player.pos.x;
    player.rollingUntil = now + 180;
    player.rollInvulnUntil = now + 140;
    player.nextSpecialAt = now + 900;
    return;
  }

  if (input === "down") {
    // Rune Trap: instant small explosion at feet.
    pushSpecialHitboxFrom(player, "player", now, {
      w: 80,
      h: 40,
      offsetX: 0,
      offsetY: player.size.h * 0.5 - 6,
      kind: "light",
      base: 260,
      scaling: 2.0,
      damage: 7,
      dirY: -0.15,
      lifetimeMs: 220,
    });
    player.nextSpecialAt = now + 1200;
    return;
  }

  if (input === "right") {
    // Magic Lance: mid-range fast poke.
    pushSpecialHitboxFrom(player, "player", now, {
      w: 90,
      h: 40,
      offsetXFacing: player.size.w,
      useFacing: true,
      offsetY: -player.size.h * 0.2,
      kind: "light",
      base: 300,
      scaling: 2.1,
      damage: 8,
      dirY: -0.2,
      lifetimeMs: 160,
    });
    player.nextSpecialAt = now + 850;
    return;
  }

  // Neutral Orb: slow-moving projectile.
  const speed = 420;
  pushSpecialHitboxFrom(player, "player", now, {
    w: 28,
    h: 28,
    offsetXFacing: player.size.w * 0.5 + 22,
    useFacing: true,
    offsetY: -player.size.h * 0.3,
    kind: "light",
    base: 230,
    scaling: 1.4,
    damage: 5,
    dirY: 0,
    lifetimeMs: 1100,
    vx: dir * speed,
    vy: 0,
  });
  player.nextSpecialAt = now + 900;
}

