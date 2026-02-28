"use strict";

function clear() { ctx.clearRect(0, 0, WORLD.width, WORLD.height); }

function drawCharacterPortrait(archetype, color, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  const s = size || 40;
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  if (archetype === "archer") {
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-s * 0.5, s * 0.2, s * 0.15, 0, Math.PI * 2);
    ctx.moveTo(-s * 0.35, s * 0.1);
    ctx.quadraticCurveTo(-s * 0.1, -s * 0.2, s * 0.4, s * 0.1);
    ctx.stroke();
  } else if (archetype === "bruiser") {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-s * 0.35, -s * 0.25, s * 0.2, 0, Math.PI * 2);
    ctx.arc(s * 0.35, -s * 0.25, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (archetype === "dummy") {
    ctx.fillRect(-s * 0.35, -s * 0.35, s * 0.7, s * 0.7);
    ctx.strokeRect(-s * 0.35, -s * 0.35, s * 0.7, s * 0.7);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold " + Math.round(s * 0.4) + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, 0);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(0, -s * 0.15, s * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();
  }
  ctx.restore();
}

function drawMenu() {
  clear();
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "bold 48px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("MINIATURE COMBAT", WORLD.width / 2, WORLD.height * 0.32);
  ctx.font = "22px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Choose mode", WORLD.width / 2, WORLD.height * 0.45);
  const options = ["Local 2P Versus", "Practice (vs Dummy)", "Tutorial", "P2 Controls"];
  const y = WORLD.height * 0.52;
  const lineHeight = 48;
  for (let i = 0; i < options.length; i++) {
    const isSel = i === menuSelection;
    ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.5)";
    ctx.font = isSel ? "bold 28px system-ui" : "24px system-ui";
    ctx.fillText(options[i], WORLD.width / 2, y + i * lineHeight);
  }
  ctx.font = "14px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("↑↓ Select  •  Enter / Space Confirm  •  Esc Back", WORLD.width / 2, WORLD.height * 0.78);
  ctx.restore();
}

function drawP2Settings() {
  clear();
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "bold 36px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("PLAYER 2 CONTROLS", WORLD.width / 2, 50);
  ctx.font = "14px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("↑↓ Select  •  Enter to rebind  •  R reset to defaults  •  Esc back", WORLD.width / 2, 82);
  const startY = 130;
  const lineH = 42;
  for (let i = 0; i < P2_SETTINGS_ACTIONS.length; i++) {
    const action = P2_SETTINGS_ACTIONS[i];
    const label = P2_SETTINGS_LABELS[i];
    const code = p2Keybinds[action];
    const disp = codeToDisplay(code);
    const isSel = i === p2SettingsSelection;
    const isRebinding = i === p2RebindingAction;
    ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.8)";
    ctx.font = isSel ? "bold 18px system-ui" : "16px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(label, WORLD.width * 0.35, startY + i * lineH);
    ctx.textAlign = "right";
    ctx.fillStyle = isRebinding ? "#ffb347" : "rgba(255,255,255,0.7)";
    ctx.fillText(isRebinding ? "Press any key..." : disp, WORLD.width * 0.65, startY + i * lineH);
  }
  ctx.restore();
}

function drawCharacterSelect() {
  clear();
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 36px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("CHARACTER SELECT", WORLD.width / 2, 50);
  ctx.font = "16px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("P1: 1 2 3  •  P2: Y U I  •  P1 color: Q E  •  P2 color: 7 9  •  Enter to start  •  Esc back", WORLD.width / 2, 88);
  const names = PLAYER_TYPES.map((t) => t.label);
  const p1Color = COLOR_PALETTE[p1ColorIndex % COLOR_PALETTE.length];
  const p2Color = COLOR_PALETTE[p2ColorIndex % COLOR_PALETTE.length];
  const p1x = WORLD.width * 0.28;
  const p2x = WORLD.width * 0.72;
  const boxY = 140;
  const boxW = 110;
  const boxH = 140;
  const gap = 16;
  const totalW = 3 * boxW + 2 * gap;
  for (let i = 0; i < 3; i++) {
    const x1 = p1x - totalW / 2 + i * (boxW + gap);
    const x2 = p2x - totalW / 2 + i * (boxW + gap);
    const isP1 = i === p1CharacterIndex;
    const isP2 = i === p2CharacterIndex;
    ctx.strokeStyle = isP1 ? "#6bffb5" : "rgba(255,255,255,0.2)";
    ctx.lineWidth = isP1 ? 4 : 2;
    ctx.strokeRect(x1, boxY, boxW, boxH);
    ctx.fillStyle = (isP1 ? p1Color : PLAYER_TYPES[i].color) + "50";
    ctx.fillRect(x1, boxY, boxW, boxH);
    drawCharacterPortrait(PLAYER_TYPES[i].archetype, isP1 ? p1Color : PLAYER_TYPES[i].color, x1 + boxW / 2, boxY + boxH / 2 - 20, 44);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(names[i], x1 + boxW / 2, boxY + boxH - 22);
    ctx.strokeStyle = isP2 ? "#ffb347" : "rgba(255,255,255,0.2)";
    ctx.lineWidth = isP2 ? 4 : 2;
    ctx.strokeRect(x2, boxY, boxW, boxH);
    ctx.fillStyle = (isP2 ? p2Color : PLAYER_TYPES[i].color) + "50";
    ctx.fillRect(x2, boxY, boxW, boxH);
    drawCharacterPortrait(PLAYER_TYPES[i].archetype, isP2 ? p2Color : PLAYER_TYPES[i].color, x2 + boxW / 2, boxY + boxH / 2 - 20, 44);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(names[i], x2 + boxW / 2, boxY + boxH - 22);
  }
  ctx.fillStyle = "#6bffb5";
  ctx.font = "bold 18px system-ui";
  ctx.fillText("Player 1", p1x, 118);
  ctx.fillStyle = p1Color;
  ctx.fillRect(p1x + 52, 114, 18, 14);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(p1x + 52, 114, 18, 14);
  ctx.fillStyle = "#ffb347";
  ctx.fillText("Player 2", p2x, 118);
  ctx.fillStyle = p2Color;
  ctx.fillRect(p2x + 52, 114, 18, 14);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(p2x + 52, 114, 18, 14);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "14px system-ui";
  ctx.fillText(PLAYER_TYPES[p1CharacterIndex].label, p1x, boxY + boxH + 28);
  ctx.fillText(PLAYER_TYPES[p2CharacterIndex].label, p2x, boxY + boxH + 28);
  ctx.restore();
}

function drawTutorialOverlay() {
  if (!tutorialMode) return;
  if (tutorialCompleteAt > 0 && !tutorialComplete) return;
  ctx.save();
  ctx.textAlign = "center";
  if (tutorialComplete) {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = "#ffeb99";
    ctx.font = "bold 56px system-ui";
    ctx.fillText("TUTORIAL COMPLETE", WORLD.width / 2, WORLD.height / 2 - 60);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "24px system-ui";
    ctx.fillText("You're ready to fight!", WORLD.width / 2, WORLD.height / 2 - 10);
    ctx.font = "16px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("Press R to reset  •  Esc or Enter to return to menu", WORLD.width / 2, WORLD.height / 2 + 50);
  } else {
    const boxH = 90;
    const boxY = WORLD.height - boxH - 20;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(20, boxY, WORLD.width - 40, boxH);
    ctx.strokeStyle = "#6bffb5";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, boxY, WORLD.width - 40, boxH);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 18px system-ui";
    ctx.fillText("TUTORIAL", WORLD.width / 2, boxY + 28);
    ctx.font = "20px system-ui";
    ctx.fillStyle = "#6bffb5";
    ctx.fillText(TUTORIAL_STEPS[tutorialStep].text, WORLD.width / 2, boxY + 58);
    ctx.font = "13px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("Step " + (tutorialStep + 1) + " of " + TUTORIAL_STEPS.length, WORLD.width / 2, boxY + 80);
  }
  ctx.restore();
}

function drawTransition(now) {
  clear();
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  grad.addColorStop(0, "#0f0f1a");
  grad.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.textAlign = "center";
  const countdown = getTransitionCountdown(now);
  let text = "";
  if (countdown === 0) text = "GO!";
  else if (countdown > 0) text = String(countdown);
  if (text) {
    ctx.fillStyle = countdown === 0 ? "#6bffb5" : "rgba(255,255,255,0.9)";
    ctx.font = "bold 120px system-ui";
    ctx.fillText(text, WORLD.width / 2, WORLD.height / 2 + 40);
  }
  ctx.restore();
}

function drawPlatform() {
  const gradient = ctx.createLinearGradient(PLATFORM.x, PLATFORM.y, PLATFORM.x, PLATFORM.y + PLATFORM.height);
  gradient.addColorStop(0, "#3d3d4f");
  gradient.addColorStop(1, "#1b1b25");
  ctx.fillStyle = gradient;
  ctx.fillRect(PLATFORM.x, PLATFORM.y, PLATFORM.width, PLATFORM.height);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(PLATFORM.x, PLATFORM.y, PLATFORM.width, 2);
}

function drawEntity(fighter, now) {
  const aabb = getAABB(fighter);
  ctx.save();
  if (roundOver && fighter === roundOverWinner && roundOverStartTime) {
    const elapsed = (now || performance.now()) - roundOverStartTime;
    const pulseDur = 800;
    const t = Math.min(1, elapsed / pulseDur);
    const scale = 1 + 0.15 * Math.sin(elapsed * 0.012) * (1 - t * 0.5);
    const glowAlpha = 0.4 * (1 - t);
    const cx = aabb.x + aabb.w / 2, cy = aabb.y + aabb.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    if (glowAlpha > 0) {
      ctx.shadowColor = fighter.color;
      ctx.shadowBlur = 20 + 10 * Math.sin(elapsed * 0.01);
      ctx.globalAlpha = 1;
    }
  }
  if ((fighter === player || fighter === player2) && fighter.rollInvulnUntil && performance.now() < fighter.rollInvulnUntil) ctx.globalAlpha = 0.4;
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
      ctx.fillStyle = effect.text === "!" ? "#ff6b6b" : "#adff2f";
      ctx.font = effect.text === "!" ? "bold 28px system-ui" : "bold 22px system-ui";
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
  drawEntity(player, now);
  if (gameState === GAME_STATE.VERSUS && player2) drawEntity(player2, now);
  else drawEntity(dummy, now);
  drawHitboxes(now);
  drawEffects(now);
  ctx.restore();
  if (tutorialMode) drawTutorialOverlay();
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
  const portraitSize = 20;
  const textX = 44;
  const row1Y = 22;
  const row2Y = 42;
  const playerState = now < player.stunnedUntil ? "HITSTUN" : now < player.rollingUntil ? "ROLL" : player.blocking ? "BLOCK" : player.onGround ? "GROUND" : "AIR";
  if (gameState === GAME_STATE.VERSUS && player2) {
    drawCharacterPortrait(player.archetype, player.color, 12 + portraitSize / 2, row1Y, portraitSize);
    ctx.fillText(`P1 ${player.name}: ${Math.round(player.damage)}%  Stocks: ${playerStocks}  ${playerState}`, textX, row1Y + 4);
    const p2State = now < player2.stunnedUntil ? "HITSTUN" : now < player2.rollingUntil ? "ROLL" : player2.blocking ? "BLOCK" : player2.onGround ? "GROUND" : "AIR";
    drawCharacterPortrait(player2.archetype, player2.color, 12 + portraitSize / 2, row2Y, portraitSize);
    ctx.fillText(`P2 ${player2.name}: ${Math.round(player2.damage)}%  Stocks: ${player2Stocks}  ${p2State}`, textX, row2Y + 4);
  } else {
    drawCharacterPortrait(player.archetype, player.color, 12 + portraitSize / 2, row1Y, portraitSize);
    ctx.fillText(`P: ${Math.round(player.damage)}%  Stocks: ${playerStocks}  ${playerState}`, textX, row1Y + 4);
    drawCharacterPortrait(dummy.archetype, dummy.color, 12 + portraitSize / 2, row2Y, portraitSize);
    ctx.fillText(`D: ${Math.round(dummy.damage)}%  Stocks: ${dummyStocks}  ${dummy.onGround ? "GROUND" : "AIR"}`, textX, row2Y + 4);
    ctx.fillText(`Dummy Mode (T): ${DUMMY_MODE_LABELS[dummyMode]}`, 12, 64);
  }
  ctx.textAlign = "left";
  if (currentComboCount > 1 && now - lastComboHitTime <= COMBO_RESET_MS) {
    ctx.textAlign = "right";
    ctx.font = "bold 14px system-ui";
    ctx.fillText(`${currentComboCount} HIT  /  ${Math.round(currentComboDamage)}%`, WORLD.width - 16, 24);
  }
  if (gamePaused) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.textAlign = "center";
    ctx.font = "bold 36px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText("PAUSED", WORLD.width / 2, WORLD.height / 2 - 50);
    const opts = ["Resume", "Exit to menu"];
    for (let i = 0; i < opts.length; i++) {
      const isSel = i === pauseMenuSelection;
      ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.6)";
      ctx.font = isSel ? "bold 22px system-ui" : "20px system-ui";
      ctx.fillText(opts[i], WORLD.width / 2, WORLD.height / 2 + 10 + i * 40);
    }
    ctx.font = "13px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("↑↓ Select  •  Enter / Space  •  Esc = Resume", WORLD.width / 2, WORLD.height / 2 + 110);
  }
  if (roundOver) {
    ctx.textAlign = "center";
    ctx.font = "bold 32px system-ui";
    let winnerText = "ROUND OVER";
    if (gameState === GAME_STATE.VERSUS && player2) {
      if (playerStocks > 0 && player2Stocks <= 0) winnerText = "P1 " + player.name + " WINS";
      else if (player2Stocks > 0 && playerStocks <= 0) winnerText = "P2 " + player2.name + " WINS";
    } else {
      if (playerStocks > 0 && dummyStocks <= 0) winnerText = player.name + " WINS";
      else if (dummyStocks > 0 && playerStocks <= 0) winnerText = "DUMMY WINS";
    }
    ctx.fillText(winnerText, WORLD.width / 2, WORLD.height / 2 - 36);
    if (gameState === GAME_STATE.PRACTICE) {
      ctx.font = "14px system-ui";
      ctx.fillText(`Best combo: ${bestComboCount} hit / ${Math.round(bestComboDamage)}%`, WORLD.width / 2, WORLD.height / 2 + 2);
      ctx.font = "16px system-ui";
      ctx.fillText("Press R to reset", WORLD.width / 2, WORLD.height / 2 + 28);
    } else if (gameState === GAME_STATE.VERSUS && player2) {
      const opts = ["Restart", "Change characters", "Exit to menu"];
      const startY = WORLD.height / 2 + 8;
      const lineH = 36;
      for (let i = 0; i < opts.length; i++) {
        const isSel = i === roundOverSelection;
        ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.6)";
        ctx.font = isSel ? "bold 20px system-ui" : "18px system-ui";
        ctx.fillText(opts[i], WORLD.width / 2, startY + i * lineH);
      }
      ctx.font = "13px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("↑↓ Select  •  Enter / Space confirm  •  R = Restart", WORLD.width / 2, WORLD.height / 2 + 130);
    }
  }
  ctx.restore();
}

