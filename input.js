"use strict";

// ---------- INPUT ----------
const keys = new Set();
let spaceHeld = false;
let jumpPressed = false;
let blockKeyJustPressed = false;
let dashPressed = false;
let lastJumpPressAt = 0;

let jumpPressedP2 = false;
let blockKeyJustPressedP2 = false;
let dashPressedP2 = false;
let lastJumpPressAtP2 = 0;


window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Minus", "Escape"].includes(e.code)) e.preventDefault();
  if (gameState === GAME_STATE.VERSUS && player2 && isP2Key(e)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);

  if (gameState === GAME_STATE.MENU) {
    if (e.code === "ArrowDown") { menuSelection = (menuSelection + 1) % 3; return; }
    if (e.code === "ArrowUp") { menuSelection = (menuSelection - 1 + 3) % 3; return; }
    if (e.code === "Enter" || e.code === "Space") {
      if (menuSelection === 0) startPractice();
      else if (menuSelection === 1) { gameState = GAME_STATE.VERSUS_SELECT; p1CharacterIndex = 0; p2CharacterIndex = 0; p1ColorIndex = 0; p2ColorIndex = 0; }
      else { gameState = GAME_STATE.P2_SETTINGS; p2SettingsSelection = 0; p2RebindingAction = null; }
    }
    return;
  }

  if (gameState === GAME_STATE.P2_SETTINGS) {
    if (p2RebindingAction !== null) {
      e.preventDefault();
      const action = P2_SETTINGS_ACTIONS[p2RebindingAction];
      if (e.code !== "Escape") {
        p2Keybinds[action] = e.code;
        saveP2Keybinds();
      }
      p2RebindingAction = null;
    } else {
      if (e.code === "Escape" || e.code === "Backspace") {
        gameState = GAME_STATE.MENU;
        return;
      }
      if (e.code === "ArrowDown") { p2SettingsSelection = (p2SettingsSelection + 1) % P2_SETTINGS_ACTIONS.length; return; }
      if (e.code === "ArrowUp") { p2SettingsSelection = (p2SettingsSelection - 1 + P2_SETTINGS_ACTIONS.length) % P2_SETTINGS_ACTIONS.length; return; }
      if (e.code === "Enter" || e.code === "Space") {
        p2RebindingAction = p2SettingsSelection;
      }
      if (e.code === "KeyR") {
        resetP2Keybinds();
      }
    }
    return;
  }

  if (gameState === GAME_STATE.VERSUS_SELECT) {
    if (e.code === "Escape") { goToMenu(); return; }
    if (e.code === "Digit1") p1CharacterIndex = 0;
    if (e.code === "Digit2") p1CharacterIndex = 1;
    if (e.code === "Digit3") p1CharacterIndex = 2;
    if (e.code === "KeyY") p2CharacterIndex = 0;
    if (e.code === "KeyU") p2CharacterIndex = 1;
    if (e.code === "KeyI") p2CharacterIndex = 2;
    if (e.code === "KeyQ") p1ColorIndex = (p1ColorIndex - 1 + COLOR_PALETTE.length) % COLOR_PALETTE.length;
    if (e.code === "KeyE") p1ColorIndex = (p1ColorIndex + 1) % COLOR_PALETTE.length;
    if (e.code === "Digit7") p2ColorIndex = (p2ColorIndex - 1 + COLOR_PALETTE.length) % COLOR_PALETTE.length;
    if (e.code === "Digit9") p2ColorIndex = (p2ColorIndex + 1) % COLOR_PALETTE.length;
    if (e.code === "Enter" || e.code === "Space") goToTransition();
    return;
  }

  if (gameState !== GAME_STATE.PRACTICE && gameState !== GAME_STATE.VERSUS) return;

  if (gamePaused) {
    if (e.code === "Escape") { gamePaused = false; return; }
    if (e.code === "ArrowDown") { pauseMenuSelection = (pauseMenuSelection + 1) % 2; return; }
    if (e.code === "ArrowUp") { pauseMenuSelection = (pauseMenuSelection - 1 + 2) % 2; return; }
    if (e.code === "Enter" || e.code === "Space") {
      if (pauseMenuSelection === 0) gamePaused = false;
      else { goToMenu(); gamePaused = false; roundOver = false; }
    }
    return;
  }

  if (roundOver && gameState === GAME_STATE.VERSUS) {
    if (e.code === "ArrowDown") { roundOverSelection = (roundOverSelection + 1) % 3; return; }
    if (e.code === "ArrowUp") { roundOverSelection = (roundOverSelection - 1 + 3) % 3; return; }
    if (e.code === "Enter" || e.code === "Space" || (e.code === "KeyR" && roundOverSelection === 0)) {
      if (roundOverSelection === 0) { roundOver = false; goToTransition(); }
      else if (roundOverSelection === 1) { gameState = GAME_STATE.VERSUS_SELECT; roundOver = false; }
      else { goToMenu(); roundOver = false; }
    }
    return;
  }

  if (gameState === GAME_STATE.VERSUS && player2 && isP2Key(e)) {
    if (e.code === p2Keybinds.jump) {
      lastJumpPressAtP2 = performance.now();
      jumpPressedP2 = true;
    }
    if (e.code === p2Keybinds.dash) dashPressedP2 = true;
    if (e.code === p2Keybinds.special) performPlayer2Special();
    if (e.code === p2Keybinds.heavy) spawnAttackFor(player2, "player2", "heavy");
    if (e.code === p2Keybinds.block) { blockKeyJustPressedP2 = true; player2.blocking = true; }
    return;
  }

  if (e.code === "Space") {
    lastJumpPressAt = performance.now();
    if (!spaceHeld) jumpPressed = true;
    spaceHeld = true;
  }
  if (e.code === "KeyV") { blockKeyJustPressed = true; player.blocking = true; }
  if (e.code === "KeyW") dashPressed = true;
  if (gameState === GAME_STATE.PRACTICE) {
    if (e.code === "KeyZ") applyPlayerType(playerTypeIndex + 1);
    if (e.code === "Digit1") { playerTypeIndex = 0; hardReset(); }
    if (e.code === "Digit2") { playerTypeIndex = 1; hardReset(); }
    if (e.code === "Digit3") { playerTypeIndex = 2; hardReset(); }
    if (e.code === "KeyT") dummyMode = (dummyMode + 1) % DUMMY_MODE_LABELS.length;
  }
  if (e.code === "Escape") { gamePaused = true; pauseMenuSelection = 0; return; }
  if (e.code === "KeyX") performPlayerSpecial();
  else if (e.code === "KeyC") spawnAttack("heavy");
  if (e.code === "KeyR") { if (gameState === GAME_STATE.VERSUS && roundOver) return; hardReset(); }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "Space") {
    spaceHeld = false;
    if (player && !player.lastJumpWasDouble && player.vel.y < 0) player.vel.y *= 0.5;
  }
  if (e.code === "KeyV") player.blocking = false;
  if (player2 && e.code === p2Keybinds.block) player2.blocking = false;
  if (player2 && e.code === p2Keybinds.jump && player2.vel.y < 0 && !player2.lastJumpWasDouble) player2.vel.y *= 0.5;
});

