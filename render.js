"use strict";

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
    const lifetime = hb.lifetimeMs || ATTACK_LIFETIME_MS;
    if (age > lifetime) continue;
    const alpha = Math.max(0, 1 - age / lifetime);
    if (hb.style === "trap") {
      ctx.globalAlpha = 0.35 + 0.2 * alpha;
      const grad = ctx.createLinearGradient(hb.x, hb.y, hb.x, hb.y + hb.h);
      grad.addColorStop(0, "rgba(255,230,150,0.9)");
      grad.addColorStop(1, "rgba(255,180,80,0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
    } else {
      ctx.globalAlpha = 0.2 + 0.3 * alpha;
      ctx.fillStyle = hb.kind === "heavy" ? "#ffb347" : "#6bffb5";
      ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
    }
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
  ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(Math.max(0, roundTimeRemaining))}`, WORLD.width / 2, 22);
  ctx.textAlign = "left";
  if (currentComboCount > 1 && now - lastComboHitTime <= COMBO_RESET_MS) {
    ctx.textAlign = "right";
    ctx.font = "bold 14px system-ui";
    ctx.fillText(`${currentComboCount} HIT  /  ${Math.round(currentComboDamage)}%`, WORLD.width - 16, 24);
  }
  if (roundOver) {
    ctx.textAlign = "center";
    ctx.font = "bold 32px system-ui";
    let winnerText = "ROUND OVER";
    if (roundTimeRemaining <= 0) {
      if (playerStocks > dummyStocks) winnerText = player.name + " WINS (TIME)";
      else if (dummyStocks > playerStocks) winnerText = "DUMMY WINS (TIME)";
      else winnerText = (player.damage <= dummy.damage ? player.name : "DUMMY") + " WINS (LOWER %)";
    } else {
      if (playerStocks > 0 && dummyStocks <= 0) winnerText = player.name + " WINS";
      else if (dummyStocks > 0 && playerStocks <= 0) winnerText = "DUMMY WINS";
    }
    ctx.fillText(winnerText, WORLD.width / 2, WORLD.height / 2 - 36);
    ctx.font = "14px system-ui";
    ctx.fillText(`Best combo: ${bestComboCount} hit / ${Math.round(bestComboDamage)}%`, WORLD.width / 2, WORLD.height / 2 + 2);
    ctx.font = "16px system-ui";
    ctx.fillText("Press R to reset", WORLD.width / 2, WORLD.height / 2 + 28);
  }
  ctx.restore();
}

