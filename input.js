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
  if (e.code === "F11" && p1RebindingAction === null && p2RebindingAction === null) {
    e.preventDefault();
    toggleFullscreen();
    return;
  }
  keys.add(e.code);

  if (gameState === GAME_STATE.TITLE) {
    playSfx("menuConfirm");
    startTransition(GAME_STATE.MENU);
    menuSelection = 0;
    return;
  }
  if (gameState === GAME_STATE.MENU) {
    if (e.code === "ArrowDown") { playSfx("menuSelect"); menuSelection = (menuSelection + 1) % 4; return; }
    if (e.code === "ArrowUp") { playSfx("menuSelect"); menuSelection = (menuSelection - 1 + 4) % 4; return; }
    if (e.code === "Enter" || e.code === "Space") {
      playSfx("menuConfirm");
      if (menuSelection === 0) { startTransition(GAME_STATE.VERSUS_SELECT); p1CharacterIndex = 0; p2CharacterIndex = 0; p1ColorIndex = 0; p2ColorIndex = 0; }
      else if (menuSelection === 1) startPractice();
      else if (menuSelection === 2) startTutorial();
      else { startTransition(GAME_STATE.SETTINGS); settingsSelection = 0; }
    }
    return;
  }

  if (gameState === GAME_STATE.SETTINGS) {
    if (e.code === "Escape" || e.code === "Backspace") {
      playSfx("menuBack");
      startTransition(GAME_STATE.MENU);
      return;
    }
    const settingsCount = 6;
    if (e.code === "ArrowDown") { playSfx("menuSelect"); settingsSelection = (settingsSelection + 1) % settingsCount; return; }
    if (e.code === "ArrowUp") { playSfx("menuSelect"); settingsSelection = (settingsSelection - 1 + settingsCount) % settingsCount; return; }
    if (e.code === "ArrowLeft") {
      if (settingsSelection === 3) { playSfx("menuSelect"); setMusicVolume(Math.max(0, musicVolume - 5)); return; }
      if (settingsSelection === 4) { playSfx("menuSelect"); setEffectsVolume(Math.max(0, effectsVolume - 5)); return; }
    }
    if (e.code === "ArrowRight") {
      if (settingsSelection === 3) { playSfx("menuSelect"); setMusicVolume(Math.min(100, musicVolume + 5)); return; }
      if (settingsSelection === 4) { playSfx("menuSelect"); setEffectsVolume(Math.min(100, effectsVolume + 5)); return; }
    }
    if (e.code === "Enter" || e.code === "Space") {
      playSfx("menuConfirm");
      if (settingsSelection === 0) {
        startTransition(GAME_STATE.P1_SETTINGS);
        p1SettingsMode = "profile";
        p1SettingsSelection = 0;
        p1RebindingAction = null;
        p1RebindConflict = null;
        p1SettingsFromSettings = true;
      } else if (settingsSelection === 1) {
        startTransition(GAME_STATE.P2_SETTINGS);
        p2SettingsSelection = 0;
        p2RebindingAction = null;
        p2RebindConflict = null;
        p2SettingsFromSettings = true;
      } else if (settingsSelection === 2) {
        toggleFullscreen();
      } else if (settingsSelection === 5) {
        startTransition(GAME_STATE.CREDITS);
      }
    }
    return;
  }

  if (gameState === GAME_STATE.P1_SETTINGS) {
    if (p1RebindingAction !== null) {
      e.preventDefault();
      const action = P1_SETTINGS_ACTIONS[p1RebindingAction];
      if (e.code !== "Escape") {
        setP1Keybind(p1SettingsProfile, action, e.code);
        p1RebindConflict = getP1KeybindConflict(p1SettingsProfile, action, e.code);
      } else {
        p1RebindConflict = null;
      }
      p1RebindingAction = null;
    } else if (p1SettingsMode === "profile") {
      if (e.code === "Escape" || e.code === "Backspace") {
        playSfx("menuBack");
        startTransition(GAME_STATE.SETTINGS);
        return;
      }
      if (e.code === "ArrowDown") { playSfx("menuSelect"); p1SettingsSelection = (p1SettingsSelection + 1) % P1_PROFILE_OPTIONS.length; return; }
      if (e.code === "ArrowUp") { playSfx("menuSelect"); p1SettingsSelection = (p1SettingsSelection - 1 + P1_PROFILE_OPTIONS.length) % P1_PROFILE_OPTIONS.length; return; }
      if (e.code === "Enter" || e.code === "Space") {
        playSfx("menuConfirm");
        p1SettingsProfile = P1_PROFILE_OPTIONS[p1SettingsSelection].profile;
        p1SettingsMode = "rebind";
        p1SettingsSelection = 0;
      }
    } else {
      if (e.code === "Escape" || e.code === "Backspace") {
        playSfx("menuBack");
        p1SettingsMode = "profile";
        p1SettingsSelection = 0;
        p1RebindConflict = null;
        return;
      }
      if (e.code === "ArrowDown") { playSfx("menuSelect"); p1SettingsSelection = (p1SettingsSelection + 1) % P1_SETTINGS_ACTIONS.length; return; }
      if (e.code === "ArrowUp") { playSfx("menuSelect"); p1SettingsSelection = (p1SettingsSelection - 1 + P1_SETTINGS_ACTIONS.length) % P1_SETTINGS_ACTIONS.length; return; }
      if (e.code === "Enter" || e.code === "Space") {
        playSfx("menuConfirm");
        p1RebindingAction = p1SettingsSelection;
      }
      if (e.code === "KeyR") {
        if (p1SettingsProfile === "solo") resetP1SoloKeybinds();
        else resetP1LocalKeybinds();
        p1RebindConflict = null;
      }
    }
    return;
  }

  if (gameState === GAME_STATE.CREDITS) {
    if (e.code === "Escape" || e.code === "Backspace" || e.code === "Enter" || e.code === "Space") {
      playSfx("menuBack");
      startTransition(GAME_STATE.SETTINGS);
      return;
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
        p2RebindConflict = getP2KeybindConflict(action, e.code);
      } else {
        p2RebindConflict = null;
      }
      p2RebindingAction = null;
    } else {
      if (e.code === "Escape" || e.code === "Backspace") {
        playSfx("menuBack");
        startTransition(p2SettingsFromSettings ? GAME_STATE.SETTINGS : GAME_STATE.MENU);
        p2SettingsFromSettings = false;
        p2RebindConflict = null;
        return;
      }
      if (e.code === "ArrowDown") { playSfx("menuSelect"); p2SettingsSelection = (p2SettingsSelection + 1) % P2_SETTINGS_ACTIONS.length; return; }
      if (e.code === "ArrowUp") { playSfx("menuSelect"); p2SettingsSelection = (p2SettingsSelection - 1 + P2_SETTINGS_ACTIONS.length) % P2_SETTINGS_ACTIONS.length; return; }
      if (e.code === "Enter" || e.code === "Space") {
        playSfx("menuConfirm");
        p2RebindingAction = p2SettingsSelection;
      }
      if (e.code === "KeyR") {
        resetP2Keybinds();
      }
    }
    return;
  }

  if (gameState === GAME_STATE.VERSUS_SELECT) {
    if (e.code === "Escape") { playSfx("menuBack"); goToMenu(); return; }
    if (e.code === "Digit1") { playSfx("menuSelect"); p1CharacterIndex = 0; }
    if (e.code === "Digit2") { playSfx("menuSelect"); p1CharacterIndex = 1; }
    if (e.code === "Digit3") { playSfx("menuSelect"); p1CharacterIndex = 2; }
    if (e.code === "KeyY") { playSfx("menuSelect"); p2CharacterIndex = 0; }
    if (e.code === "KeyU") { playSfx("menuSelect"); p2CharacterIndex = 1; }
    if (e.code === "KeyI") { playSfx("menuSelect"); p2CharacterIndex = 2; }
    if (e.code === "KeyQ") { playSfx("menuSelect"); p1ColorIndex = (p1ColorIndex - 1 + COLOR_PALETTE.length) % COLOR_PALETTE.length; }
    if (e.code === "KeyE") { playSfx("menuSelect"); p1ColorIndex = (p1ColorIndex + 1) % COLOR_PALETTE.length; }
    if (e.code === "Digit7") { playSfx("menuSelect"); p2ColorIndex = (p2ColorIndex - 1 + COLOR_PALETTE.length) % COLOR_PALETTE.length; }
    if (e.code === "Digit9") { playSfx("menuSelect"); p2ColorIndex = (p2ColorIndex + 1) % COLOR_PALETTE.length; }
    if (e.code === "Digit4") { playSfx("menuSelect"); stageIndex = 0; }
    if (e.code === "Digit5") { playSfx("menuSelect"); stageIndex = 1; }
    if (e.code === "Digit6") { playSfx("menuSelect"); stageIndex = 2; }
    if (e.code === "Enter" || e.code === "Space") { playSfx("menuConfirm"); goToVersusIntro(); }
    return;
  }

  if (gameState === GAME_STATE.VERSUS_INTRO) {
    if (e.code === "Enter" || e.code === "Space") {
      playSfx("menuConfirm");
      startTransition(GAME_STATE.TRANSITION);
    }
    return;
  }

  if (gameState !== GAME_STATE.PRACTICE && gameState !== GAME_STATE.VERSUS) return;

  if (tutorialMode && tutorialComplete && (e.code === "Escape" || e.code === "Enter" || e.code === "Space")) {
    playSfx("menuConfirm");
    goToMenu();
    tutorialMode = false;
    tutorialComplete = false;
    return;
  }

  if (gamePaused) {
    if (e.code === "Escape") { playSfx("menuBack"); gamePaused = false; return; }
    const pauseOpts = 3;
    if (e.code === "ArrowDown") { playSfx("menuSelect"); pauseMenuSelection = (pauseMenuSelection + 1) % pauseOpts; return; }
    if (e.code === "ArrowUp") { playSfx("menuSelect"); pauseMenuSelection = (pauseMenuSelection - 1 + pauseOpts) % pauseOpts; return; }
    if (e.code === "Enter" || e.code === "Space") {
      playSfx("menuConfirm");
      if (pauseMenuSelection === 0) gamePaused = false;
      else if (pauseMenuSelection === 1) { gamePaused = false; roundOver = false; roundOverWinner = null; goToTransition(); }
      else { goToMenu(); gamePaused = false; roundOver = false; roundOverWinner = null; }
    }
    return;
  }

  if (roundOver && gameState === GAME_STATE.VERSUS) {
    if (e.code === "ArrowDown") { playSfx("menuSelect"); roundOverSelection = (roundOverSelection + 1) % 3; return; }
    if (e.code === "ArrowUp") { playSfx("menuSelect"); roundOverSelection = (roundOverSelection - 1 + 3) % 3; return; }
    if (e.code === "Enter" || e.code === "Space" || (e.code === "KeyR" && roundOverSelection === 0)) {
      playSfx("menuConfirm");
      if (roundOverSelection === 0) { roundOver = false; roundOverWinner = null; goToTransition(); }
      else if (roundOverSelection === 1) { gameState = GAME_STATE.VERSUS_SELECT; roundOver = false; roundOverWinner = null; }
      else { goToMenu(); roundOver = false; roundOverWinner = null; }
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

  const p1Keys = getP1Keybinds(gameState === GAME_STATE.VERSUS ? "local" : "solo");
  const isP1Key = e.code === p1Keys.moveLeft || e.code === p1Keys.moveRight || e.code === p1Keys.jump || e.code === p1Keys.fastFall || e.code === p1Keys.dash || e.code === p1Keys.special || e.code === p1Keys.heavy || e.code === p1Keys.block;
  if (isP1Key) e.preventDefault();
  if (e.code === p1Keys.jump) {
    lastJumpPressAt = performance.now();
    if (!spaceHeld) jumpPressed = true;
    spaceHeld = true;
  }
  if (e.code === p1Keys.block) { blockKeyJustPressed = true; player.blocking = true; }
  if (e.code === p1Keys.dash) dashPressed = true;
  if (gameState === GAME_STATE.PRACTICE) {
    if (e.code === "KeyZ") applyPlayerType(playerTypeIndex + 1);
    if (e.code === "Digit1") { playerTypeIndex = 0; hardReset(); }
    if (e.code === "Digit2") { playerTypeIndex = 1; hardReset(); }
    if (e.code === "Digit3") { playerTypeIndex = 2; hardReset(); }
    if (e.code === "KeyT") dummyMode = (dummyMode + 1) % DUMMY_MODE_LABELS.length;
  }
  if (e.code === "Escape") { gamePaused = true; pauseMenuSelection = 0; return; }
  if (e.code === p1Keys.special) { performPlayerSpecial(); if (tutorialMode && tutorialStep === 2) tutorialSpecialDone = true; }
  else if (e.code === p1Keys.heavy) { spawnAttack("heavy"); if (tutorialMode && tutorialStep === 2) tutorialHeavyDone = true; }
  if (e.code === "KeyR") { if (gameState === GAME_STATE.VERSUS && roundOver) return; hardReset(); }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (player && (gameState === GAME_STATE.PRACTICE || gameState === GAME_STATE.VERSUS)) {
    const p1Keys = getP1Keybinds(gameState === GAME_STATE.VERSUS ? "local" : "solo");
    if (e.code === p1Keys.block) player.blocking = false;
    if (e.code === p1Keys.jump) {
      spaceHeld = false;
      if (!player.lastJumpWasDouble && player.vel.y < 0) player.vel.y *= 0.5;
    }
  }
  if (player2 && e.code === p2Keybinds.block) player2.blocking = false;
  if (player2 && e.code === p2Keybinds.jump && player2.vel.y < 0 && !player2.lastJumpWasDouble) player2.vel.y *= 0.5;
});

window.addEventListener("click", () => {
  if (gameState === GAME_STATE.TITLE) {
    playSfx("menuConfirm");
    startTransition(GAME_STATE.MENU);
    menuSelection = 0;
  }
});

