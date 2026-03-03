"use strict";

// ---------- INPUT ----------
// Raw keyboard state. Gameplay input is sampled deterministically per sim frame in `game.js`.
const keys = new Set();


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
  if (e.code === "KeyN" && p1RebindingAction === null && p2RebindingAction === null) {
    netDebugOverlay = !netDebugOverlay;
  }
  if (e.code === "KeyP" && p1RebindingAction === null && p2RebindingAction === null) {
    if (gameState === GAME_STATE.VERSUS && (!netcodeIsEnabled || !netcodeIsEnabled())) runDeterminismSelfTest(240);
  }

  if (gameState === GAME_STATE.TITLE) {
    playSfx("menuConfirm");
    startTransition(GAME_STATE.MENU);
    menuSelection = 0;
    return;
  }
  if (gameState === GAME_STATE.MENU) {
    const menuCount = 6;
    if (e.code === "ArrowDown") { playSfx("menuSelect"); menuSelection = (menuSelection + 1) % menuCount; return; }
    if (e.code === "ArrowUp") { playSfx("menuSelect"); menuSelection = (menuSelection - 1 + menuCount) % menuCount; return; }
    if (e.code === "Enter" || e.code === "Space") {
      playSfx("menuConfirm");
      if (menuSelection === 0) {
        startTransition(GAME_STATE.VERSUS_SELECT);
        p1CharacterIndex = 0; p2CharacterIndex = 0; p1ColorIndex = 0; p2ColorIndex = 0;
      } else if (menuSelection === 1) {
        startTransition(GAME_STATE.ONLINE_MENU);
        onlineMenuSelection = 0;
      } else if (menuSelection === 2) {
        startPractice();
      } else if (menuSelection === 3) {
        startTutorial();
      } else if (menuSelection === 4) {
        startTransition(GAME_STATE.SETTINGS);
        settingsSelection = 0;
      } else if (menuSelection === 5) {
        startTransition(GAME_STATE.CREDITS);
      }
    }
    return;
  }

  if (gameState === GAME_STATE.ONLINE_MENU) {
    const menuCount = 3;
    if (e.code === "Escape" || e.code === "Backspace") { playSfx("menuBack"); startTransition(GAME_STATE.MENU); return; }
    if (e.code === "ArrowDown") { playSfx("menuSelect"); onlineMenuSelection = (onlineMenuSelection + 1) % menuCount; return; }
    if (e.code === "ArrowUp") { playSfx("menuSelect"); onlineMenuSelection = (onlineMenuSelection - 1 + menuCount) % menuCount; return; }
    if (e.code === "Enter" || e.code === "Space") {
      playSfx("menuConfirm");
      if (onlineMenuSelection === 0) {
        gameState = GAME_STATE.ONLINE_LOBBY;
        screenEnterTime = performance.now();
        // Host always connects to local server; joiner uses DEFAULT_SIGNALING_URL (your public IP).
        netOnlineHost("ws://localhost:8787");
      } else if (onlineMenuSelection === 1) {
        const code = prompt("Enter room code") || "";
        if (code.trim()) {
          gameState = GAME_STATE.ONLINE_LOBBY;
          screenEnterTime = performance.now();
          netOnlineJoin(DEFAULT_SIGNALING_URL, code.trim());
        } else {
          playSfx("menuBack");
        }
      } else {
        playSfx("menuBack");
        startTransition(GAME_STATE.MENU);
      }
    }
    return;
  }

  if (gameState === GAME_STATE.ONLINE_LOBBY) {
    if (e.code === "Escape" || e.code === "Backspace") {
      playSfx("menuBack");
      netOnlineDisconnect();
      startTransition(GAME_STATE.MENU);
      return;
    }
  }

  if (gameState === GAME_STATE.SETTINGS) {
    if (e.code === "Escape" || e.code === "Backspace") {
      playSfx("menuBack");
      startTransition(GAME_STATE.MENU);
      return;
    }
    const settingsCount = 5;
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
    if (e.code === "Digit4") { playSfx("menuSelect"); p1CharacterIndex = 3; }
    if (e.code === "Digit5") { playSfx("menuSelect"); p1CharacterIndex = 4; }
    if (e.code === "Digit6") { playSfx("menuSelect"); p1CharacterIndex = 5; }
    if (e.code === "KeyY") { playSfx("menuSelect"); p2CharacterIndex = 0; }
    if (e.code === "KeyU") { playSfx("menuSelect"); p2CharacterIndex = 1; }
    if (e.code === "KeyI") { playSfx("menuSelect"); p2CharacterIndex = 2; }
    if (e.code === "KeyO") { playSfx("menuSelect"); p2CharacterIndex = 3; }
    if (e.code === "KeyP") { playSfx("menuSelect"); p2CharacterIndex = 4; }
    if (e.code === "BracketLeft") { playSfx("menuSelect"); p2CharacterIndex = 5; }
    if (e.code === "KeyQ") { playSfx("menuSelect"); p1ColorIndex = (p1ColorIndex - 1 + COLOR_PALETTE.length) % COLOR_PALETTE.length; }
    if (e.code === "KeyE") { playSfx("menuSelect"); p1ColorIndex = (p1ColorIndex + 1) % COLOR_PALETTE.length; }
    if (e.code === "Digit7") { playSfx("menuSelect"); p2ColorIndex = (p2ColorIndex - 1 + COLOR_PALETTE.length) % COLOR_PALETTE.length; }
    if (e.code === "Digit9") { playSfx("menuSelect"); p2ColorIndex = (p2ColorIndex + 1) % COLOR_PALETTE.length; }
    if (e.code === "ArrowLeft") { playSfx("menuSelect"); stageIndex = (stageIndex - 1 + STAGE_NAMES.length) % STAGE_NAMES.length; }
    if (e.code === "ArrowRight") { playSfx("menuSelect"); stageIndex = (stageIndex + 1) % STAGE_NAMES.length; }
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

  if (gameState === GAME_STATE.PRACTICE) {
    if (e.code === "KeyZ") applyPlayerType(playerTypeIndex + 1);
    if (e.code === "Digit1") { playerTypeIndex = 0; hardReset(); }
    if (e.code === "Digit2") { playerTypeIndex = 1; hardReset(); }
    if (e.code === "Digit3") { playerTypeIndex = 2; hardReset(); }
    if (e.code === "KeyT") dummyMode = (dummyMode + 1) % DUMMY_MODE_LABELS.length;
  }
  if (e.code === "Escape") { gamePaused = true; pauseMenuSelection = 0; return; }
  if (e.code === "KeyR") { if (gameState === GAME_STATE.VERSUS && roundOver) return; hardReset(); }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

window.addEventListener("click", () => {
  if (gameState === GAME_STATE.TITLE) {
    playSfx("menuConfirm");
    startTransition(GAME_STATE.MENU);
    menuSelection = 0;
  }
});

