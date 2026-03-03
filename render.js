"use strict";

function clear() { ctx.clearRect(0, 0, WORLD.width, WORLD.height); }

function drawTransitionOverlay() {
  const alpha = getTransitionOverlayAlpha();
  if (alpha <= 0) return;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0," + alpha + ")";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.restore();
}

function roundRectPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundedRect(x, y, w, h, r) {
  roundRectPath(x, y, w, h, r);
  ctx.fill();
}

function drawTextWithShadow(text, x, y, fill, shadowColor, shadowBlur) {
  ctx.shadowColor = shadowColor || "rgba(0,0,0,0.8)";
  ctx.shadowBlur = shadowBlur != null ? shadowBlur : 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function drawCharacterPortrait(archetype, color, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  const s = size || 40;
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  if (archetype === "archer") {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, s * 0.15);
    ctx.lineTo(s * 0.45, -s * 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.45, -s * 0.15);
    ctx.lineTo(s * 0.25, -s * 0.05);
    ctx.lineTo(s * 0.35, -s * 0.15);
    ctx.lineTo(s * 0.25, -s * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, s * 0.15);
    ctx.lineTo(-s * 0.35, s * 0.08);
    ctx.lineTo(-s * 0.35, s * 0.22);
    ctx.closePath();
    ctx.fill();
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
  } else if (archetype === "vanguard") {
    // Shield + sword icon
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, 0);
    ctx.lineTo(-s * 0.1, -s * 0.4);
    ctx.lineTo(-s * 0.1, s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(244,241,222,0.95)";
    ctx.fillRect(s * 0.05, -s * 0.45, s * 0.12, s * 0.9);
    ctx.fillRect(-s * 0.08, -s * 0.1, s * 0.38, s * 0.14);
  } else if (archetype === "blitz") {
    // Lightning bolt
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.45);
    ctx.lineTo(0, -s * 0.1);
    ctx.lineTo(-s * 0.15, -s * 0.1);
    ctx.lineTo(s * 0.3, s * 0.45);
    ctx.lineTo(0, s * 0.1);
    ctx.lineTo(s * 0.15, s * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (archetype === "shade") {
    // Mask with shadow
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.05, s * 0.5, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(-s * 0.5, 0, s, s * 0.35);
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

function drawTitleScreen(now) {
  clear();
  ctx.save();
  const t = now * 0.0003;
  const grad = ctx.createLinearGradient(0, 0, WORLD.width * (0.5 + 0.1 * Math.sin(t)), WORLD.height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(0.5, "#16213e");
  grad.addColorStop(1, "#0f3460");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  const titleY = WORLD.height * 0.38 + 4 * Math.sin(now * 0.002);
  ctx.font = "bold 52px system-ui";
  ctx.textAlign = "center";
  drawTextWithShadow("MINIATURE COMBAT", WORLD.width / 2, titleY, "rgba(255,255,255,0.98)", "rgba(0,0,0,0.6)", 12);
  ctx.font = "20px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  const blink = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now * 0.004));
  ctx.globalAlpha = blink;
  ctx.fillText("Press any key to start", WORLD.width / 2, WORLD.height * 0.55);
  ctx.restore();
}

function drawMenu(now) {
  clear();
  ctx.save();
  const elapsed = now - (screenEnterTime || now);
  const t = now * 0.00025;
  const grad = ctx.createLinearGradient(WORLD.width * 0.2 * Math.sin(t), 0, WORLD.width, WORLD.height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(0.6, "#16213e");
  grad.addColorStop(1, "#0f3460");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  fillRoundedRect(WORLD.width * 0.2, WORLD.height * 0.22, WORLD.width * 0.6, 120, 12);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "bold 44px system-ui";
  ctx.textAlign = "center";
  drawTextWithShadow("MINIATURE COMBAT", WORLD.width / 2, WORLD.height * 0.32, "rgba(255,255,255,0.98)", "rgba(0,0,0,0.5)", 6);
  ctx.font = "20px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText("Choose mode", WORLD.width / 2, WORLD.height * 0.42);
  const options = ["Local 2P Versus", "Online Versus (room code)", "Practice (vs Dummy)", "Tutorial", "Settings", "Credits"];
  const y = WORLD.height * 0.5;
  const lineHeight = 50;
  const pulse = 1 + 0.03 * Math.sin(now * 0.008);
  const cx = WORLD.width / 2;
  for (let i = 0; i < options.length; i++) {
    const isSel = i === menuSelection;
    const delay = i * 70;
    const anim = Math.min(1, (elapsed - delay) / 180);
    const slideX = (1 - anim) * -50;
    const alpha = 0.35 + 0.65 * anim;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(slideX, 0);
    if (isSel) {
      ctx.translate(cx, y + i * lineHeight);
      ctx.scale(pulse, pulse);
      ctx.translate(-cx, -(y + i * lineHeight));
    }
    ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.55)";
    ctx.font = isSel ? "bold 26px system-ui" : "22px system-ui";
    ctx.textAlign = "center";
    if (isSel) drawTextWithShadow(options[i], cx, y + i * lineHeight, "#6bffb5", "rgba(0,0,0,0.4)", 4);
    else ctx.fillText(options[i], cx, y + i * lineHeight);
    ctx.restore();
  }
  ctx.font = "13px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textAlign = "center";
  // Place navigation hint just below the last menu option (Credits).
  ctx.fillText("↑↓ Select  •  Enter / Space Confirm  •  Esc Back", WORLD.width / 2, WORLD.height * 0.82);
  ctx.restore();
}

function drawOnlineMenu(now) {
  clear();
  ctx.save();
  const t = now * 0.00025;
  const grad = ctx.createLinearGradient(WORLD.width * 0.25 * Math.sin(t), 0, WORLD.width, WORLD.height);
  grad.addColorStop(0, "#141428");
  grad.addColorStop(1, "#0f3460");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  fillRoundedRect(WORLD.width * 0.18, WORLD.height * 0.2, WORLD.width * 0.64, 420, 16);

  ctx.textAlign = "center";
  ctx.font = "bold 36px system-ui";
  drawTextWithShadow("ONLINE VERSUS", WORLD.width / 2, 120, "rgba(255,255,255,0.95)", "rgba(0,0,0,0.5)", 6);
  ctx.font = "16px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("Host a room code or join one (WebRTC P2P)", WORLD.width / 2, 155);

  const options = ["Host room", "Join room", "Back"];
  const startY = 240;
  const lineH = 56;
  const pulse = 1 + 0.03 * Math.sin(now * 0.008);
  for (let i = 0; i < options.length; i++) {
    const isSel = i === onlineMenuSelection;
    ctx.save();
    if (isSel) {
      ctx.translate(WORLD.width / 2, startY + i * lineH);
      ctx.scale(pulse, pulse);
      ctx.translate(-WORLD.width / 2, -(startY + i * lineH));
    }
    ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.65)";
    ctx.font = isSel ? "bold 26px system-ui" : "22px system-ui";
    if (isSel) drawTextWithShadow(options[i], WORLD.width / 2, startY + i * lineH, "#6bffb5", "rgba(0,0,0,0.35)", 4);
    else ctx.fillText(options[i], WORLD.width / 2, startY + i * lineH);
    ctx.restore();
  }

  ctx.font = "13px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText("↑↓ Select  •  Enter / Space Confirm  •  Esc Back", WORLD.width / 2, WORLD.height * 0.82);
  ctx.restore();
}

function drawOnlineLobby(now) {
  clear();
  ctx.save();
  const t = now * 0.0002;
  const grad = ctx.createLinearGradient(WORLD.width * 0.25 * Math.sin(t), 0, WORLD.width, WORLD.height);
  grad.addColorStop(0, "#101021");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  fillRoundedRect(WORLD.width * 0.16, WORLD.height * 0.22, WORLD.width * 0.68, 360, 16);

  const stats = typeof netcodeGetStats === "function" ? netcodeGetStats() : null;
  const role = stats && stats.role ? stats.role : "—";
  const state = stats && stats.connectionState ? stats.connectionState : "—";
  const code = stats && stats.roomCode ? stats.roomCode : null;
  const err = stats && stats.lastError ? stats.lastError : null;

  ctx.textAlign = "center";
  ctx.font = "bold 34px system-ui";
  drawTextWithShadow("ONLINE LOBBY", WORLD.width / 2, 130, "rgba(255,255,255,0.95)", "rgba(0,0,0,0.45)", 6);

  ctx.font = "18px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Role: " + role.toUpperCase(), WORLD.width / 2, 185);
  ctx.fillText("Status: " + state, WORLD.width / 2, 215);

  if (code) {
    ctx.font = "bold 42px system-ui";
    ctx.fillStyle = "#6bffb5";
    drawTextWithShadow(code, WORLD.width / 2, 290, "#6bffb5", "rgba(0,0,0,0.4)", 6);
    ctx.font = "16px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("Share this room code with your opponent", WORLD.width / 2, 325);
  } else {
    ctx.font = "16px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("Waiting for room code / connection…", WORLD.width / 2, 300);
  }

  if (err) {
    ctx.font = "14px system-ui";
    ctx.fillStyle = "rgba(255,120,120,0.9)";
    ctx.fillText(err, WORLD.width / 2, 370);
  }

  ctx.font = "13px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText("Esc Back (disconnect)", WORLD.width / 2, WORLD.height * 0.82);
  ctx.restore();
}

function drawSettings(now) {
  clear();
  ctx.save();
  const t = now * 0.0002;
  const grad = ctx.createLinearGradient(WORLD.width * 0.3 * Math.sin(t), 0, WORLD.width, WORLD.height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  fillRoundedRect(WORLD.width * 0.15, 80, WORLD.width * 0.7, 430, 16);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "bold 34px system-ui";
  ctx.textAlign = "center";
  drawTextWithShadow("SETTINGS", WORLD.width / 2, 52, "rgba(255,255,255,0.98)", "rgba(0,0,0,0.4)", 6);
  ctx.font = "14px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("↑↓ Select  •  ←→ Volume  •  Enter confirm  •  F11 = Fullscreen  •  Esc back", WORLD.width / 2, 100);
  const startY = 155;
  const lineH = 58;
  const elapsed = now - (screenEnterTime || now);
  const fullscreenOn = !!document.fullscreenElement;
  const items = [
    { label: "P1 Controls", value: "Solo / Local 2P" },
    { label: "P2 Controls", value: "Rebind keys" },
    { label: "Fullscreen", value: fullscreenOn ? "On" : "Off" },
    { label: "Music Volume", value: musicVolume + "%" },
    { label: "Effects Volume", value: effectsVolume + "%" },
  ];
  for (let i = 0; i < items.length; i++) {
    const isSel = i === settingsSelection;
    const anim = Math.min(1, (elapsed - i * 60) / 150);
    ctx.globalAlpha = 0.5 + 0.5 * anim;
    ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.85)";
    ctx.font = isSel ? "bold 22px system-ui" : "20px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(items[i].label, WORLD.width * 0.35, startY + i * lineH);
    ctx.textAlign = "right";
    ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.7)";
    ctx.fillText(items[i].value, WORLD.width * 0.65, startY + i * lineH);
    if (i > 2 && i < 5) {
      const barW = 200;
      const barX = WORLD.width / 2 - barW / 2;
      const barY = startY + i * lineH + 10;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      fillRoundedRect(barX, barY, barW, 10, 5);
      ctx.fillStyle = isSel ? "#6bffb5" : "rgba(107,255,181,0.65)";
      const fillW = barW * (i === 3 ? musicVolume : effectsVolume) / 100;
      if (fillW > 0) fillRoundedRect(barX, barY, fillW, 10, 5);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCredits(now) {
  clear();
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  fillRoundedRect(WORLD.width * 0.2, WORLD.height * 0.18, WORLD.width * 0.6, 380, 16);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "bold 36px system-ui";
  ctx.textAlign = "center";
  drawTextWithShadow("CREDITS", WORLD.width / 2, WORLD.height * 0.38, "rgba(255,255,255,0.98)", "rgba(0,0,0,0.4)", 6);
  ctx.font = "24px system-ui";
  ctx.fillStyle = "#6bffb5";
  ctx.fillText("Made by Maximiliaan Gadeyne", WORLD.width / 2, WORLD.height * 0.5);
  ctx.font = "20px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("Thanks for playing!", WORLD.width / 2, WORLD.height * 0.58);
  ctx.font = "14px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("Esc or Enter to back", WORLD.width / 2, WORLD.height * 0.72);
  ctx.restore();
}

function drawP2Settings(now) {
  clear();
  ctx.save();
  const t = now * 0.0002;
  const grad = ctx.createLinearGradient(WORLD.width * 0.2 * Math.cos(t), 0, WORLD.width, WORLD.height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  fillRoundedRect(WORLD.width * 0.2, 80, WORLD.width * 0.6, 400, 12);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "bold 32px system-ui";
  ctx.textAlign = "center";
  drawTextWithShadow("PLAYER 2 CONTROLS", WORLD.width / 2, 52, "rgba(255,255,255,0.98)", "rgba(0,0,0,0.4)", 6);
  ctx.font = "14px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("↑↓ Select  •  Enter to rebind  •  R reset to defaults  •  Esc back", WORLD.width / 2, 84);
  const startY = 128;
  const lineH = 44;
  const elapsed = now - (screenEnterTime || now);
  for (let i = 0; i < P2_SETTINGS_ACTIONS.length; i++) {
    const action = P2_SETTINGS_ACTIONS[i];
    const label = P2_SETTINGS_LABELS[i];
    const code = p2Keybinds[action];
    const disp = codeToDisplay(code);
    const isSel = i === p2SettingsSelection;
    const isRebinding = i === p2RebindingAction;
    const anim = Math.min(1, (elapsed - i * 40) / 120);
    ctx.globalAlpha = 0.6 + 0.4 * anim;
    ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.85)";
    ctx.font = isSel ? "bold 18px system-ui" : "16px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(label, WORLD.width * 0.35, startY + i * lineH);
    ctx.textAlign = "right";
    ctx.fillStyle = isRebinding ? "#ffb347" : "rgba(255,255,255,0.75)";
    ctx.fillText(isRebinding ? "Press any key..." : disp, WORLD.width * 0.65, startY + i * lineH);
    ctx.globalAlpha = 1;
  }
  if (p2RebindConflict) {
    const conflictLabel = P2_SETTINGS_LABELS[P2_SETTINGS_ACTIONS.indexOf(p2RebindConflict)];
    ctx.font = "13px system-ui";
    ctx.fillStyle = "#ffb347";
    ctx.textAlign = "center";
    ctx.fillText("Conflict: also used for " + conflictLabel, WORLD.width / 2, 395);
  }
  ctx.restore();
}

function drawP1Settings(now) {
  clear();
  ctx.save();
  const t = now * 0.0002;
  const grad = ctx.createLinearGradient(WORLD.width * 0.2 * Math.cos(t), 0, WORLD.width, WORLD.height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  fillRoundedRect(WORLD.width * 0.2, 80, WORLD.width * 0.6, p1SettingsMode === "profile" ? 220 : 480, 12);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "bold 32px system-ui";
  ctx.textAlign = "center";
  drawTextWithShadow("PLAYER 1 CONTROLS", WORLD.width / 2, 52, "rgba(255,255,255,0.98)", "rgba(0,0,0,0.4)", 6);
  const elapsed = now - (screenEnterTime || now);
  if (p1SettingsMode === "profile") {
    ctx.font = "14px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("Choose which keybind set to edit", WORLD.width / 2, 84);
    const startY = 128;
    const lineH = 52;
    for (let i = 0; i < P1_PROFILE_OPTIONS.length; i++) {
      const opt = P1_PROFILE_OPTIONS[i];
      const isSel = i === p1SettingsSelection;
      const anim = Math.min(1, (elapsed - i * 50) / 120);
      ctx.globalAlpha = 0.6 + 0.4 * anim;
      ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.85)";
      ctx.font = isSel ? "bold 20px system-ui" : "18px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(opt.label, WORLD.width / 2, startY + i * lineH);
      ctx.globalAlpha = 1;
    }
    ctx.font = "13px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("↑↓ Select  •  Enter  •  Esc back", WORLD.width / 2, 270);
  } else {
    ctx.font = "14px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("↑↓ Select  •  Enter to rebind  •  R reset to defaults  •  Esc back", WORLD.width / 2, 84);
    const profileLabel = p1SettingsProfile === "solo" ? "Playing alone" : "Local 2P";
    ctx.fillText(profileLabel, WORLD.width / 2, 100);
    const keybinds = getP1Keybinds(p1SettingsProfile);
    const startY = 128;
    const lineH = 44;
    for (let i = 0; i < P1_SETTINGS_ACTIONS.length; i++) {
      const action = P1_SETTINGS_ACTIONS[i];
      const label = P1_SETTINGS_LABELS[i];
      const code = keybinds[action];
      const disp = codeToDisplay(code);
      const isSel = i === p1SettingsSelection;
      const isRebinding = i === p1RebindingAction;
      const anim = Math.min(1, (elapsed - i * 40) / 120);
      ctx.globalAlpha = 0.6 + 0.4 * anim;
      ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.85)";
      ctx.font = isSel ? "bold 18px system-ui" : "16px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(label, WORLD.width * 0.35, startY + i * lineH);
      ctx.textAlign = "right";
      ctx.fillStyle = isRebinding ? "#ffb347" : "rgba(255,255,255,0.75)";
      ctx.fillText(isRebinding ? "Press any key..." : disp, WORLD.width * 0.65, startY + i * lineH);
      ctx.globalAlpha = 1;
    }
    if (p1RebindConflict) {
      const conflictLabel = P1_SETTINGS_LABELS[P1_SETTINGS_ACTIONS.indexOf(p1RebindConflict)];
      ctx.font = "13px system-ui";
      ctx.fillStyle = "#ffb347";
      ctx.textAlign = "center";
      ctx.fillText("Conflict: also used for " + conflictLabel, WORLD.width / 2, 535);
    }
  }
  ctx.restore();
}

function drawCharacterSelect(now) {
  clear();
  ctx.save();
  const t = now * 0.00025;
  const grad = ctx.createLinearGradient(WORLD.width * 0.25 * Math.sin(t), 0, WORLD.width, WORLD.height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(0.5, "#16213e");
  grad.addColorStop(1, "#0f3460");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "bold 34px system-ui";
  ctx.textAlign = "center";
  drawTextWithShadow("CHARACTER SELECT", WORLD.width / 2, 52, "rgba(255,255,255,0.98)", "rgba(0,0,0,0.4)", 6);
  ctx.font = "15px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("P1: 1–6  •  P2: Y U I O P [  •  P1 color: Q E  •  P2 color: 7 9  •  Stage: ← →  •  Enter / Esc", WORLD.width / 2, 88);
  ctx.font = "14px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("Stage: " + STAGE_NAMES[stageIndex], WORLD.width / 2, 118);
  const names = PLAYER_TYPES.map((t) => t.label);
  const p1Color = COLOR_PALETTE[p1ColorIndex % COLOR_PALETTE.length];
  const p2Color = COLOR_PALETTE[p2ColorIndex % COLOR_PALETTE.length];
  const p1x = WORLD.width * 0.28;
  const p2x = WORLD.width * 0.72;
  const boxY = 142;
  const boxW = 112;
  const boxH = 142;
  const gap = 18;
  const totalW = 3 * boxW + 2 * gap;
  const rowGap = 26;
  const elapsed = now - (screenEnterTime || now);
  const glow = 0.5 + 0.5 * Math.sin(now * 0.006);
  const count = PLAYER_TYPES.length;
  const cols = 3;
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const anim = Math.min(1, (elapsed - (row * cols + col) * 80) / 250);
    const yOffset = row * (boxH + rowGap);
    const yBox = boxY + yOffset;
    const x1 = p1x - totalW / 2 + col * (boxW + gap);
    const x2 = p2x - totalW / 2 + col * (boxW + gap);
    const isP1 = i === p1CharacterIndex;
    const isP2 = i === p2CharacterIndex;
    ctx.globalAlpha = 0.5 + 0.5 * anim;
    if (isP1) {
      ctx.shadowColor = "#6bffb5";
      ctx.shadowBlur = 12 * glow;
      ctx.strokeStyle = "#6bffb5";
      ctx.lineWidth = 4;
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
    }
    ctx.fillStyle = (isP1 ? p1Color : PLAYER_TYPES[i].color) + "55";
    roundRectPath(x1, yBox, boxW, boxH, 10);
    ctx.fill();
    ctx.strokeStyle = isP1 ? "#6bffb5" : "rgba(255,255,255,0.25)";
    ctx.lineWidth = isP1 ? 4 : 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    drawCharacterPortrait(PLAYER_TYPES[i].archetype, isP1 ? p1Color : PLAYER_TYPES[i].color, x1 + boxW / 2, yBox + boxH / 2 - 20, 44);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(names[i], x1 + boxW / 2, yBox + boxH - 24);
    if (isP2) {
      ctx.shadowColor = "#ffb347";
      ctx.shadowBlur = 12 * glow;
      ctx.strokeStyle = "#ffb347";
      ctx.lineWidth = 4;
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
    }
    ctx.fillStyle = (isP2 ? p2Color : PLAYER_TYPES[i].color) + "55";
    roundRectPath(x2, yBox, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    drawCharacterPortrait(PLAYER_TYPES[i].archetype, isP2 ? p2Color : PLAYER_TYPES[i].color, x2 + boxW / 2, yBox + boxH / 2 - 20, 44);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(names[i], x2 + boxW / 2, yBox + boxH - 24);
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
  // Remove floating label text under characters to keep the grid clean.
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
    const stepText = typeof TUTORIAL_STEPS[tutorialStep].text === "function" ? TUTORIAL_STEPS[tutorialStep].text() : TUTORIAL_STEPS[tutorialStep].text;
    ctx.fillText(stepText, WORLD.width / 2, boxY + 58);
    ctx.font = "13px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("Step " + (tutorialStep + 1) + " of " + TUTORIAL_STEPS.length, WORLD.width / 2, boxY + 80);
  }
  ctx.restore();
}

function drawVersusIntro(now) {
  clear();
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(0.5, "#16213e");
  grad.addColorStop(1, "#0f3460");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  fillRoundedRect(WORLD.width * 0.15, WORLD.height * 0.2, WORLD.width * 0.7, WORLD.height * 0.55, 20);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "bold 48px system-ui";
  drawTextWithShadow("VS", WORLD.width / 2, WORLD.height * 0.38, "rgba(255,255,255,0.98)", "rgba(0,0,0,0.5)", 8);
  const p1Name = PLAYER_TYPES[p1CharacterIndex].label;
  const p2Name = PLAYER_TYPES[p2CharacterIndex].label;
  const p1Color = COLOR_PALETTE[p1ColorIndex % COLOR_PALETTE.length];
  const p2Color = COLOR_PALETTE[p2ColorIndex % COLOR_PALETTE.length];
  ctx.font = "bold 32px system-ui";
  ctx.fillStyle = p1Color;
  ctx.fillText("P1  " + p1Name, WORLD.width * 0.35, WORLD.height * 0.5);
  ctx.fillStyle = p2Color;
  ctx.fillText(p2Name + "  P2", WORLD.width * 0.65, WORLD.height * 0.5);
  ctx.font = "22px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(STAGE_NAMES[stageIndex], WORLD.width / 2, WORLD.height * 0.62);
  ctx.font = "14px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("Press Enter to start  •  Auto-advances in 3 sec", WORLD.width / 2, WORLD.height * 0.72);
  ctx.restore();
}

function drawTransition(now) {
  clear();
  ctx.save();
  drawStageBackground();
  drawPlatform();
  if (player) drawEntity(player, now);
  if (player2) drawEntity(player2, now);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.textAlign = "center";
  const countdown = getTransitionCountdown(now);
  let text = "";
  if (countdown === 0) text = "GO!";
  else if (countdown > 0) text = String(countdown);
  if (text) {
    ctx.fillStyle = countdown === 0 ? "#6bffb5" : "rgba(255,255,255,0.95)";
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
  const nowMs = now || performance.now();
  // No KO zoom; keep winner rendering simple and stable.
  if (!roundOver && (fighter === player || fighter === player2) && fighter.invulnUntil && (!fighter.respawnAt || nowMs >= fighter.respawnAt) && nowMs < fighter.invulnUntil) {
    const t = Math.max(0, Math.min(1, (fighter.invulnUntil - nowMs) / RESPAWN_INVULN_MS));
    const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.02);
    ctx.globalAlpha = 0.6 + 0.3 * pulse;
    ctx.shadowColor = fighter.color;
    ctx.shadowBlur = 18 * pulse * t;
  }
  if ((fighter === player || fighter === player2) && fighter.rollInvulnUntil && nowMs < fighter.rollInvulnUntil) ctx.globalAlpha = 0.4;
  // Miniature toy fighter rendering
  const cx = aabb.x + aabb.w / 2;
  const baseRadius = aabb.w * 0.65 * 0.5;
  const baseY = aabb.y + aabb.h;

  // Base
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 4, baseRadius, baseRadius * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body parameters (miniature proportions: distinct torso + legs)
  const bodyHeight = aabb.h * 0.68;
  const bodyWidth = aabb.w * 0.6;
  const bodyX = cx - bodyWidth / 2;
  const bodyY = baseY - 4 - bodyHeight;
  const headRadius = bodyWidth * 0.34;
  const torsoHeight = bodyHeight * 0.7;
  const legsHeight = bodyHeight - torsoHeight;
  const legsY = bodyY + torsoHeight;
  // Start torso slightly below the head so the head sits fully on top.
  const torsoTop = bodyY + headRadius * 0.5;
  const torsoBottom = legsY - 4;
  const headCx = cx;
  // Place head slightly above the torso so it doesn't sink into the body.
  const headCy = torsoTop - headRadius * 0.1;

  const arch = fighter.archetype || "archer";

  // Common head
  ctx.save();
  ctx.fillStyle = "#1b1b25";
  ctx.beginPath();
  ctx.arc(headCx, headCy, headRadius, 0, Math.PI * 2);
  ctx.fill();
  // Simple head accents per archetype
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  if (arch === "archer") {
    // Hood peak
    ctx.beginPath();
    ctx.moveTo(headCx, headCy - headRadius * 0.9);
    ctx.lineTo(headCx - headRadius * 0.6, headCy - headRadius * 0.2);
    ctx.lineTo(headCx + headRadius * 0.6, headCy - headRadius * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (arch === "bruiser") {
    // Headband
    ctx.fillRect(headCx - headRadius, headCy - headRadius * 0.2, headRadius * 2, headRadius * 0.28);
  } else if (arch === "mage") {
    // Little hat
    ctx.beginPath();
    ctx.moveTo(headCx, headCy - headRadius * 1.1);
    ctx.lineTo(headCx - headRadius * 0.7, headCy - headRadius * 0.2);
    ctx.lineTo(headCx + headRadius * 0.7, headCy - headRadius * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (arch === "vanguard") {
    // Helmet stripe
    ctx.fillRect(headCx - headRadius * 0.18, headCy - headRadius, headRadius * 0.36, headRadius * 1.8);
  } else if (arch === "blitz") {
    // Visor
    ctx.fillRect(headCx - headRadius * 0.9, headCy - headRadius * 0.1, headRadius * 1.8, headRadius * 0.28);
  } else if (arch === "shade") {
    // Mask
    ctx.fillRect(headCx - headRadius * 0.9, headCy + headRadius * 0.05, headRadius * 1.8, headRadius * 0.55);
  }

  // Per-archetype body/gear
  if (arch === "archer") {
    // Hood + quiver + bow (torso only)
    ctx.fillStyle = fighter.color;
    const hoodTop = torsoTop;
    const hoodBottom = torsoBottom;
    ctx.fillRect(bodyX, hoodTop, bodyWidth, hoodBottom - hoodTop);
    // Hood trim
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(headCx, headCy, headRadius * 0.95, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    // Quiver
    ctx.fillStyle = "#553b2f";
    ctx.fillRect(bodyX - bodyWidth * 0.18, hoodTop + 6, bodyWidth * 0.18, (hoodBottom - hoodTop) * 0.7);
    // Bow
    ctx.strokeStyle = "#f4d35e";
    ctx.lineWidth = 4;
    const bowX = cx + bodyWidth * 0.55 * (fighter.facing >= 0 ? 1 : -1);
    ctx.beginPath();
    ctx.moveTo(bowX, hoodTop + (hoodBottom - hoodTop) * 0.1);
    ctx.quadraticCurveTo(
      bowX + (fighter.facing >= 0 ? -8 : 8),
      hoodTop + (hoodBottom - hoodTop) * 0.5,
      bowX,
      hoodTop + (hoodBottom - hoodTop) * 0.9
    );
    ctx.stroke();
  } else if (arch === "bruiser") {
    // Chunky armor torso
    ctx.fillStyle = fighter.color;
    ctx.fillRect(bodyX, torsoTop, bodyWidth, torsoBottom - torsoTop);
    // Belt
    ctx.fillStyle = "#3b2f2f";
    ctx.fillRect(bodyX, torsoBottom - 8, bodyWidth, 6);
    // Fists
    const fistW = bodyWidth * 0.32;
    const fistH = torsoHeight * 0.4;
    ctx.fillStyle = "#ffb347";
    const leftFistX = bodyX - fistW * 0.55;
    const rightFistX = bodyX + bodyWidth - fistW * 0.45;
    const fistsY = torsoTop + (torsoBottom - torsoTop) * 0.45;
    ctx.fillRect(leftFistX, fistsY, fistW, fistH);
    ctx.fillRect(rightFistX, fistsY, fistW, fistH);
  } else if (arch === "mage") {
    // Robe
    const robeTopY = torsoTop + 4;
    const robeBottomY = baseY - 4;
    ctx.fillStyle = fighter.color;
    ctx.beginPath();
    ctx.moveTo(cx - bodyWidth * 0.3, robeTopY);
    ctx.lineTo(cx + bodyWidth * 0.3, robeTopY);
    ctx.lineTo(cx + bodyWidth * 0.5, robeBottomY);
    ctx.lineTo(cx - bodyWidth * 0.5, robeBottomY);
    ctx.closePath();
    ctx.fill();
    // Floating orb
    ctx.fillStyle = "#ffeb99";
    ctx.beginPath();
    ctx.arc(cx + bodyWidth * 0.55 * (fighter.facing >= 0 ? 1 : -1), robeTopY + 4, headRadius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (arch === "vanguard") {
    // Armor torso
    ctx.fillStyle = fighter.color;
    ctx.fillRect(bodyX, torsoTop, bodyWidth, torsoBottom - torsoTop);
    // Chest plate
    ctx.fillStyle = "#f4f1de";
    ctx.fillRect(bodyX + bodyWidth * 0.2, torsoTop + 6, bodyWidth * 0.6, torsoHeight * 0.4);
    // Sword
    const swordDir = fighter.facing >= 0 ? 1 : -1;
    const swordX = cx + bodyWidth * 0.55 * swordDir;
    ctx.fillStyle = "#f4f1de";
    ctx.fillRect(swordX - 3 * swordDir, torsoTop + 2, 6, torsoHeight * 0.9);
    ctx.fillStyle = "#c44536";
    ctx.fillRect(swordX - 8 * swordDir, torsoTop + torsoHeight * 0.4, 16, 6);
  } else if (arch === "blitz") {
    // Slim suit
    ctx.fillStyle = fighter.color;
    ctx.fillRect(bodyX + bodyWidth * 0.15, torsoTop, bodyWidth * 0.7, torsoBottom - torsoTop);
    // Scarf
    ctx.fillStyle = "#ffe28a";
    const scarfY = torsoTop + 4;
    ctx.fillRect(cx - bodyWidth * 0.3, scarfY, bodyWidth * 0.6, 6);
    ctx.beginPath();
    const tailDir = fighter.facing >= 0 ? -1 : 1;
    ctx.moveTo(cx + tailDir * bodyWidth * 0.3, scarfY + 3);
    ctx.lineTo(cx + tailDir * (bodyWidth * 0.5), scarfY + 14);
    ctx.lineTo(cx + tailDir * (bodyWidth * 0.45), scarfY + 6);
    ctx.closePath();
    ctx.fill();
  } else if (arch === "shade") {
    // Cloak
    const cloakTopY = torsoTop + 4;
    const cloakBottomY = baseY - 4;
    ctx.fillStyle = fighter.color;
    ctx.beginPath();
    ctx.moveTo(cx, cloakTopY);
    ctx.lineTo(cx + bodyWidth * 0.5, cloakBottomY);
    ctx.lineTo(cx - bodyWidth * 0.5, cloakBottomY);
    ctx.closePath();
    ctx.fill();
  } else {
    // Fallback: simple body
    ctx.fillStyle = fighter.color;
    ctx.fillRect(bodyX, bodyY, bodyWidth, torsoHeight);
  }

  // Simple face highlight
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.arc(headCx - headRadius * 0.25, headCy - headRadius * 0.1, headRadius * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Generic legs for non-robed characters
  if (arch === "archer" || arch === "bruiser" || arch === "vanguard" || arch === "blitz") {
    const legW = bodyWidth * 0.22;
    const gap = bodyWidth * 0.08;
    const leftLegX = cx - legW - gap * 0.5;
    const rightLegX = cx + gap * 0.5;
    ctx.fillStyle = fighter.color;
    ctx.fillRect(leftLegX, legsY, legW, legsHeight);
    ctx.fillRect(rightLegX, legsY, legW, legsHeight);
  }

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

function drawStageBackground() {
  const horizonY = WORLD.height * 0.55;
  const s = stageIndex % 3;
  if (s === 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    grad.addColorStop(0, "#4a6fa5");
    grad.addColorStop(0.4, "#6b8cbe");
    grad.addColorStop(0.7, "#3d5a80");
    grad.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  } else if (s === 1) {
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    grad.addColorStop(0, "#ff7b54");
    grad.addColorStop(0.3, "#ff9f6b");
    grad.addColorStop(0.6, "#c44569");
    grad.addColorStop(0.85, "#2d132c");
    grad.addColorStop(1, "#1a0a1a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    grad.addColorStop(0, "#0d1b2a");
    grad.addColorStop(0.35, "#1b263b");
    grad.addColorStop(0.65, "#415a77");
    grad.addColorStop(0.9, "#1a1a2e");
    grad.addColorStop(1, "#0f0f1a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }
  const fade = ctx.createLinearGradient(0, horizonY, 0, WORLD.height);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, horizonY, WORLD.width, WORLD.height - horizonY);
}

function draw(now) {
  clear();
  ctx.save();
  if (now < shakeUntil && shakeMagnitude > 0) {
    const ox = (Math.random() * 2 - 1) * shakeMagnitude;
    const oy = (Math.random() * 2 - 1) * shakeMagnitude;
    ctx.translate(ox, oy);
  }
  drawStageBackground();
  drawPlatform();
  drawEntity(player, now);
  if (gameState === GAME_STATE.VERSUS && player2) drawEntity(player2, now);
  else drawEntity(dummy, now);
  const gameTime = (gameState === GAME_STATE.VERSUS || gameState === GAME_STATE.PRACTICE) && typeof simNowMs === "function" ? simNowMs() : now;
  drawHitboxes(gameTime);
  drawEffects(gameTime);
  ctx.restore();
  if (tutorialMode) drawTutorialOverlay();
  ctx.save();
  if (gameState === GAME_STATE.VERSUS && player2) {
    const p1Damage = Math.round(player.damage);
    const p2Damage = Math.round(player2.damage);
    function damageColor(val) {
      if (val < 60) return "#9dffde";
      if (val < 120) return "#ffe28a";
      return "#ff6b6b";
    }
    const pad = 24;
    const topY = 22;
    const portraitSize = 36;

    // P1 HUD (left)
    ctx.textAlign = "left";
    drawCharacterPortrait(player.archetype, player.color, pad + portraitSize / 2, topY + portraitSize / 2, portraitSize);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 22px system-ui";
    ctx.fillText(`P1 ${player.name}`, pad + portraitSize + 14, topY + 12);
    ctx.font = "bold 30px system-ui";
    ctx.fillStyle = damageColor(p1Damage);
    ctx.fillText(`${p1Damage}%`, pad + portraitSize + 14, topY + 44);
    ctx.font = "16px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    const p1StocksStr = "●".repeat(Math.max(0, Math.min(playerStocks, MAX_STOCKS)));
    ctx.fillText(`Stocks: ${p1StocksStr}`, pad + portraitSize + 14, topY + 68);

    // P2 HUD (right)
    const rightPad = 24;
    const rightX = WORLD.width - rightPad;
    ctx.textAlign = "right";
    drawCharacterPortrait(player2.archetype, player2.color, rightX - portraitSize / 2, topY + portraitSize / 2, portraitSize);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 22px system-ui";
    ctx.fillText(`P2 ${player2.name}`, rightX - portraitSize - 14, topY + 12);
    ctx.font = "bold 30px system-ui";
    ctx.fillStyle = damageColor(p2Damage);
    ctx.fillText(`${p2Damage}%`, rightX - portraitSize - 14, topY + 44);
    ctx.font = "16px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    const p2StocksStr = "●".repeat(Math.max(0, Math.min(player2Stocks, MAX_STOCKS)));
    ctx.fillText(`Stocks: ${p2StocksStr}`, rightX - portraitSize - 14, topY + 68);
  } else {
    // Practice / single-player HUD: same style, player vs dummy
    const pDamage = Math.round(player.damage);
    const dDamage = Math.round(dummy.damage);
    function damageColor(val) {
      if (val < 60) return "#9dffde";
      if (val < 120) return "#ffe28a";
      return "#ff6b6b";
    }
    const pad = 24;
    const topY = 22;
    const portraitSize = 36;

    // Player HUD (left)
    ctx.textAlign = "left";
    drawCharacterPortrait(player.archetype, player.color, pad + portraitSize / 2, topY + portraitSize / 2, portraitSize);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 22px system-ui";
    ctx.fillText(`Player ${player.name}`, pad + portraitSize + 14, topY + 12);
    ctx.font = "bold 30px system-ui";
    ctx.fillStyle = damageColor(pDamage);
    ctx.fillText(`${pDamage}%`, pad + portraitSize + 14, topY + 44);
    ctx.font = "16px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    const pStocksStr = "●".repeat(Math.max(0, Math.min(playerStocks, MAX_STOCKS)));
    ctx.fillText(`Stocks: ${pStocksStr}`, pad + portraitSize + 14, topY + 68);

    // Dummy HUD (right)
    const rightPad = 24;
    const rightX = WORLD.width - rightPad;
    ctx.textAlign = "right";
    drawCharacterPortrait(dummy.archetype, dummy.color, rightX - portraitSize / 2, topY + portraitSize / 2, portraitSize);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 22px system-ui";
    ctx.fillText("Dummy", rightX - portraitSize - 14, topY + 12);
    ctx.font = "bold 30px system-ui";
    ctx.fillStyle = damageColor(dDamage);
    ctx.fillText(`${dDamage}%`, rightX - portraitSize - 14, topY + 44);
    ctx.font = "16px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    const dStocksStr = "●".repeat(Math.max(0, Math.min(dummyStocks, MAX_STOCKS)));
    ctx.fillText(`Stocks: ${dStocksStr}`, rightX - portraitSize - 14, topY + 68);

    // Dummy mode hint centered under HUD
    ctx.textAlign = "center";
    ctx.font = "13px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(`Dummy Mode (T): ${DUMMY_MODE_LABELS[dummyMode]}`, WORLD.width / 2, topY + 96);
  }
  if (currentComboCount > 1 && now - lastComboHitTime <= COMBO_RESET_MS) {
    ctx.textAlign = "right";
    ctx.font = "bold 14px system-ui";
    ctx.fillText(`${currentComboCount} HIT  /  ${Math.round(currentComboDamage)}%`, WORLD.width - 16, 24);
  }
  if (netDebugOverlay && typeof netcodeGetStats === "function") {
    const s = netcodeGetStats();
    if (s && s.enabled) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      fillRoundedRect(12, WORLD.height - 110, 420, 96, 10);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "left";
      const behind = s.lastRemoteFrame >= 0 && simFrame < s.lastRemoteFrame ? ((s.lastRemoteFrame - simFrame) / 60).toFixed(1) : null;
      const ahead = s.lastRemoteFrame >= 0 && simFrame > s.lastRemoteFrame ? ((simFrame - s.lastRemoteFrame) / 60).toFixed(1) : null;
      const delayStr = behind != null ? `YOU BEHIND ~${behind}s` : (ahead != null ? `you ahead ~${ahead}s` : "");
      const lines = [
        `net: ${s.connectionState || "?"}  role: ${(s.role || "?").toUpperCase()}  room: ${s.roomCode || "-"}`,
        `frame: ${simFrame}  remoteLast: ${s.lastRemoteFrame}  recv: ${s.receivedInputCount != null ? s.receivedInputCount : "-"}  ${delayStr}`,
        `rollbacks: ${s.rollbackCount}  lastFrom: ${s.lastRollbackFromFrame}`,
        `Keep game window in focus (no minimize/alt-tab) to avoid huge delay.`,
      ];
      for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 24, WORLD.height - 86 + i * 18);
      ctx.restore();
    }
  }
  if (determinismTestMessage && performance.now() < determinismTestMessageUntil) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 14px system-ui";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    fillRoundedRect(WORLD.width / 2 - 170, 86, 340, 28, 10);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(determinismTestMessage, WORLD.width / 2, 106);
    ctx.restore();
  }
  if (gamePaused) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.textAlign = "center";
    ctx.font = "bold 36px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText("PAUSED", WORLD.width / 2, WORLD.height / 2 - 50);
    const opts = ["Resume", "Rematch", "Exit to menu"];
    for (let i = 0; i < opts.length; i++) {
      const isSel = i === pauseMenuSelection;
      ctx.fillStyle = isSel ? "#6bffb5" : "rgba(255,255,255,0.6)";
      ctx.font = isSel ? "bold 22px system-ui" : "20px system-ui";
      ctx.fillText(opts[i], WORLD.width / 2, WORLD.height / 2 + 10 + i * 40);
    }
    ctx.font = "13px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("↑↓ Select  •  Enter / Space  •  Esc = Resume", WORLD.width / 2, WORLD.height / 2 + 140);
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

