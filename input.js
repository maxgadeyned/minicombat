"use strict";

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
  if (e.code === "Digit1") { playerTypeIndex = 0; hardReset(); }
  if (e.code === "Digit2") { playerTypeIndex = 1; hardReset(); }
  if (e.code === "Digit3") { playerTypeIndex = 2; hardReset(); }
  if (e.code === "KeyJ") performPlayerSpecial();
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

