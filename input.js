"use strict";

// ---------- INPUT ----------
// Raw keyboard state. Gameplay input is sampled deterministically per sim frame in `game.js`.
const keys = new Set();


const CHAR_SELECT_CODES = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5", "Numpad6"];
window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Minus", "Escape", "Backspace"].includes(e.code)) e.preventDefault();
  if (gameState === GAME_STATE.VERSUS && player2 && isP2Key(e)) e.preventDefault();
  if (gameState === GAME_STATE.ONLINE_LOBBY && CHAR_SELECT_CODES.includes(e.code)) e.preventDefault();
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
    if (e.code === "KeyM") {
      // Toggle experimental net mode (central server vs P2P host-authoritative).
      playSfx("menuSelect");
      if (typeof onlineP2PEnabled !== "undefined") onlineP2PEnabled = !onlineP2PEnabled;
      return;
    }
    if (e.code === "ArrowDown") { playSfx("menuSelect"); onlineMenuSelection = (onlineMenuSelection + 1) % menuCount; return; }
    if (e.code === "ArrowUp") { playSfx("menuSelect"); onlineMenuSelection = (onlineMenuSelection - 1 + menuCount) % menuCount; return; }
    if (e.code === "Enter" || e.code === "Space") {
      playSfx("menuConfirm");
      if (onlineMenuSelection === 0) {
        // Host setup screen (enter name before creating room).
        const suggested = (typeof netcodeGetLobbyState === "function" && netcodeGetLobbyState().localName) || "Host";
        onlineHostName = suggested;
        onlineHostSelection = 0;
        gameState = GAME_STATE.ONLINE_HOST;
        screenEnterTime = performance.now();
      } else if (onlineMenuSelection === 1) {
        onlineJoinName = "";
        onlineJoinCode = "";
        onlineJoinSelection = 0;
        gameState = GAME_STATE.ONLINE_JOIN;
        screenEnterTime = performance.now();
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
    const stats = typeof netcodeGetStats === "function" ? netcodeGetStats() : null;
    const role = stats && stats.role;
    // Rename (both sides).
    if (e.code === "KeyN") {
      const lobby = typeof netcodeGetLobbyState === "function" ? netcodeGetLobbyState() : null;
      const current = lobby && lobby.localName ? lobby.localName : (role === "host" ? "Host" : "Guest");
      const name = prompt("Enter your name", current) || "";
      if (typeof netcodeSetLocalName === "function" && name.trim()) netcodeSetLocalName(name.trim());
      return;
    }
    // Character selection: 1–6 (number row or numpad) map to character indices.
    const charKeyToIndex = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5 };
    const charIdx = charKeyToIndex[e.code];
    if (charIdx !== undefined) {
      e.preventDefault();
      if (typeof netcodePushLobbyCharSelection === "function") netcodePushLobbyCharSelection(charIdx);
      if (typeof netcodeSetLocalCharIndex === "function") netcodeSetLocalCharIndex(charIdx);
      playSfx("menuSelect");
      return;
    }
    // Host-only stage controls & start.
    if (role === "host") {
      if (e.code === "ArrowLeft") { if (typeof netcodeHostAdjustStage === "function") netcodeHostAdjustStage(-1); return; }
      if (e.code === "ArrowRight") { if (typeof netcodeHostAdjustStage === "function") netcodeHostAdjustStage(1); return; }
      if (e.code === "KeyR") { if (typeof netcodeHostSetRandomStage === "function") netcodeHostSetRandomStage(); return; }
      if (e.code === "Enter" || e.code === "Space") {
        if (typeof netOnlineHostStartMatch === "function" && typeof netOnlineHostCanStart === "function" && netOnlineHostCanStart()) {
          playSfx("menuConfirm");
          netOnlineHostStartMatch();
        }
        return;
      }
    }
    return;
  }

  if (gameState === GAME_STATE.ONLINE_HOST) {
    if (e.code === "Escape") {
      playSfx("menuBack");
      startTransition(GAME_STATE.ONLINE_MENU);
      return;
    }
    const maxFields = 3; // name, connect, back
    if (e.code === "ArrowDown") {
      playSfx("menuSelect");
      onlineHostSelection = (onlineHostSelection + 1) % maxFields;
      return;
    }
    if (e.code === "ArrowUp") {
      playSfx("menuSelect");
      onlineHostSelection = (onlineHostSelection - 1 + maxFields) % maxFields;
      return;
    }
    if (onlineHostSelection === 0) {
      if (e.code === "Backspace") {
        if (onlineHostName.length) onlineHostName = onlineHostName.slice(0, -1);
        return;
      }
      if (e.key && e.key.length === 1) {
        const ch = e.key;
        if (onlineHostName.length < 16 && ch >= " " && ch <= "~") {
          onlineHostName += ch;
        }
        return;
      }
    }
    if (e.code === "Enter" || e.code === "Space") {
      playSfx("menuConfirm");
      if (onlineHostSelection === 1) {
        // Connect as host.
        const name = (onlineHostName || "Host").trim();
        gameState = GAME_STATE.ONLINE_LOBBY;
        screenEnterTime = performance.now();
        netOnlineHost(getServerUrl(), name);
      } else if (onlineHostSelection === 2) {
        startTransition(GAME_STATE.ONLINE_MENU);
      }
      return;
    }
    return;
  }

  if (gameState === GAME_STATE.ONLINE_JOIN) {
    if (e.code === "Escape") {
      // Back out to online menu.
      playSfx("menuBack");
      startTransition(GAME_STATE.ONLINE_MENU);
      return;
    }
    const maxFields = 4; // name, code, connect, back
    if (e.code === "ArrowDown") {
      playSfx("menuSelect");
      onlineJoinSelection = (onlineJoinSelection + 1) % maxFields;
      return;
    }
    if (e.code === "ArrowUp") {
      playSfx("menuSelect");
      onlineJoinSelection = (onlineJoinSelection - 1 + maxFields) % maxFields;
      return;
    }
    // Text input only when focused on name or code.
    if (onlineJoinSelection === 0 || onlineJoinSelection === 1) {
      if (e.code === "Backspace") {
        if (onlineJoinSelection === 0 && onlineJoinName.length) onlineJoinName = onlineJoinName.slice(0, -1);
        else if (onlineJoinSelection === 1 && onlineJoinCode.length) onlineJoinCode = onlineJoinCode.slice(0, -1);
        return;
      }
      if (e.key && e.key.length === 1) {
        const ch = e.key;
        // Restrict code to uppercase letters/numbers; name can be any visible char.
        if (onlineJoinSelection === 0) {
          if (onlineJoinName.length < 16 && ch >= " " && ch <= "~") {
            onlineJoinName += ch;
          }
        } else {
          const up = ch.toUpperCase();
          if (onlineJoinCode.length < 8 && /[A-Z0-9]/.test(up)) {
            onlineJoinCode += up;
          }
        }
        return;
      }
    }
    if (e.code === "Enter" || e.code === "Space") {
      playSfx("menuConfirm");
      if (onlineJoinSelection === 2) {
        // Connect.
        const name = (onlineJoinName || "Guest").trim();
        const code = (onlineJoinCode || "").trim();
        if (code) {
          gameState = GAME_STATE.ONLINE_LOBBY;
          screenEnterTime = performance.now();
          netOnlineJoin(getServerUrl(), code, name);
        }
      } else if (onlineJoinSelection === 3) {
        startTransition(GAME_STATE.ONLINE_MENU);
      }
      return;
    }
    return;
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
    // No manual skip: VS intro always flows into countdown automatically to keep both sides in sync.
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
      const isOnline = typeof netcodeIsEnabled === "function" && netcodeIsEnabled();
      if (roundOverSelection === 0) {
        // Restart / rematch.
        roundOver = false; roundOverWinner = null;
        goToTransition();
      } else if (roundOverSelection === 1) {
        if (isOnline) {
          // Back to lobby for online play.
          roundOver = false; roundOverWinner = null;
          gameState = GAME_STATE.ONLINE_LOBBY;
        } else {
          // Local change characters.
          gameState = GAME_STATE.VERSUS_SELECT; roundOver = false; roundOverWinner = null;
        }
      } else {
        goToMenu(); roundOver = false; roundOverWinner = null;
      }
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

function _getCanvasCoordsFromMouseEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener("mousedown", (e) => {
  const { x, y } = _getCanvasCoordsFromMouseEvent(e);

  // Main menu: click options.
  if (gameState === GAME_STATE.MENU) {
    const options = ["Local 2P Versus", "Online Versus (room code)", "Practice (vs Dummy)", "Tutorial", "Settings", "Credits"];
    const baseY = WORLD.height * 0.5;
    const lineH = 50;
    const cx = WORLD.width / 2;
    for (let i = 0; i < options.length; i++) {
      const oy = baseY + i * lineH;
      const hitX = Math.abs(x - cx) <= WORLD.width * 0.3;
      const hitY = y >= oy - 22 && y <= oy + 22;
      if (hitX && hitY) {
        menuSelection = i;
        playSfx("menuConfirm");
        if (i === 0) {
          startTransition(GAME_STATE.VERSUS_SELECT);
          p1CharacterIndex = 0; p2CharacterIndex = 0; p1ColorIndex = 0; p2ColorIndex = 0;
        } else if (i === 1) {
          startTransition(GAME_STATE.ONLINE_MENU);
          onlineMenuSelection = 0;
        } else if (i === 2) {
          startPractice();
        } else if (i === 3) {
          startTutorial();
        } else if (i === 4) {
          startTransition(GAME_STATE.SETTINGS);
          settingsSelection = 0;
        } else if (i === 5) {
          startTransition(GAME_STATE.CREDITS);
        }
        return;
      }
    }
  }

  // Online menu: click options.
  if (gameState === GAME_STATE.ONLINE_MENU) {
    const options = ["Host room", "Join room", "Back"];
    const startY = 240;
    const lineH = 56;
    const cx = WORLD.width / 2;
    for (let i = 0; i < options.length; i++) {
      const oy = startY + i * lineH;
      const hitX = Math.abs(x - cx) <= WORLD.width * 0.3;
      const hitY = y >= oy - 24 && y <= oy + 24;
      if (hitX && hitY) {
        onlineMenuSelection = i;
        playSfx("menuConfirm");
        if (i === 0) {
          const suggested = (typeof netcodeGetLobbyState === "function" && netcodeGetLobbyState().localName) || "Host";
          onlineHostName = suggested;
          onlineHostSelection = 0;
          gameState = GAME_STATE.ONLINE_HOST;
          screenEnterTime = performance.now();
        } else if (i === 1) {
          onlineJoinName = "";
          onlineJoinCode = "";
          onlineJoinSelection = 0;
          gameState = GAME_STATE.ONLINE_JOIN;
          screenEnterTime = performance.now();
        } else {
          startTransition(GAME_STATE.MENU);
        }
        return;
      }
    }
  }

  // Online host: click field / buttons.
  if (gameState === GAME_STATE.ONLINE_HOST) {
    const fieldY = WORLD.height * 0.38;
    const fx = WORLD.width * 0.24;
    const fw = WORLD.width * 0.52;
    const fh = 34;
    // Name field.
    if (x >= fx && x <= fx + fw && y >= fieldY && y <= fieldY + fh) {
      onlineHostSelection = 0;
      return;
    }
    // Buttons.
    const btnY = fieldY + 64;
    const btnW = 150;
    const btnH = 34;
    const centerX = WORLD.width / 2;
    const createX = centerX - 90 - btnW / 2;
    const backX = centerX + 90 - btnW / 2;
    if (y >= btnY && y <= btnY + btnH) {
      if (x >= createX && x <= createX + btnW) {
        onlineHostSelection = 1;
        playSfx("menuConfirm");
        const name = (onlineHostName || "Host").trim();
        gameState = GAME_STATE.ONLINE_LOBBY;
        screenEnterTime = performance.now();
        netOnlineHost(getServerUrl(), name);
        return;
      }
      if (x >= backX && x <= backX + btnW) {
        onlineHostSelection = 2;
        playSfx("menuBack");
        startTransition(GAME_STATE.ONLINE_MENU);
        return;
      }
    }
  }

  // Online join: click fields / buttons.
  if (gameState === GAME_STATE.ONLINE_JOIN) {
    const startY = WORLD.height * 0.35;
    const lineH = 54;
    const fx = WORLD.width * 0.24;
    const fw = WORLD.width * 0.52;
    const fh = 34;
    // Name field.
    const nameY = startY;
    if (x >= fx && x <= fx + fw && y >= nameY && y <= nameY + fh) {
      onlineJoinSelection = 0;
      return;
    }
    // Code field.
    const codeY = startY + lineH;
    if (x >= fx && x <= fx + fw && y >= codeY && y <= codeY + fh) {
      onlineJoinSelection = 1;
      return;
    }
    // Buttons.
    const btnY = startY + 2 * lineH + 12;
    const btnW = 150;
    const btnH = 34;
    const centerX = WORLD.width / 2;
    const connectX = centerX - 90 - btnW / 2;
    const backX = centerX + 90 - btnW / 2;
    if (y >= btnY && y <= btnY + btnH) {
      if (x >= connectX && x <= connectX + btnW) {
        onlineJoinSelection = 2;
        playSfx("menuConfirm");
        const name = (onlineJoinName || "Guest").trim();
        const code = (onlineJoinCode || "").trim();
        if (code) {
          gameState = GAME_STATE.ONLINE_LOBBY;
          screenEnterTime = performance.now();
          netOnlineJoin(getServerUrl(), code, name);
        }
        return;
      }
      if (x >= backX && x <= backX + btnW) {
        onlineJoinSelection = 3;
        playSfx("menuBack");
        startTransition(GAME_STATE.ONLINE_MENU);
        return;
      }
    }
  }
});

