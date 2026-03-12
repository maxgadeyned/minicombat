// Entry point: game loop and startup. All game logic lives in the split files.
"use strict";

let lastTime = performance.now();
let accumulatorMs = 0;
let prevGameState = null;
function loop(now) {
  if (prevGameState !== gameState && !transitionActive) screenEnterTime = now;
  prevGameState = gameState;

  if (transitionActive) updateScreenTransition(now);

  const frameMs = Math.min(100, now - lastTime);
  lastTime = now;
  accumulatorMs += frameMs;

  if (gameState === GAME_STATE.MENU || gameState === GAME_STATE.SETTINGS || gameState === GAME_STATE.CREDITS || gameState === GAME_STATE.P1_SETTINGS) {
    playMenuMusic();
  } else {
    stopMenuMusic();
  }
  if (gameState === GAME_STATE.TITLE) {
    drawTitleScreen(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.MENU) {
    drawMenu(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.ONLINE_MENU) {
    drawOnlineMenu(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.ONLINE_HOST) {
    drawOnlineHost(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.ONLINE_LOBBY) {
    const canvas = document.getElementById("gameCanvas");
    if (canvas && document.activeElement !== canvas) canvas.focus();
    drawOnlineLobby(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.ONLINE_JOIN) {
    drawOnlineJoin(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.VERSUS_SELECT) {
    drawCharacterSelect(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.VERSUS_INTRO) {
    if (!transitionActive && now - screenEnterTime >= 3000) startTransition(GAME_STATE.TRANSITION);
    drawVersusIntro(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.TRANSITION) {
    updateTransition(now);
    drawTransition(now);
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.SETTINGS) {
    drawSettings(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.CREDITS) {
    playMenuMusic();
    drawCredits(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.P1_SETTINGS) {
    drawP1Settings(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.P2_SETTINGS) {
    drawP2Settings(now);
    drawTransitionOverlay();
    requestAnimationFrame(loop);
    return;
  }

  // Online versus.
  const netEnabled = typeof netcodeIsEnabled === "function" && netcodeIsEnabled();
  const isOnlineVersus = netEnabled && gameState === GAME_STATE.VERSUS;
  const isP2PHost = netEnabled && typeof netcodeIsP2PHost === "function" && netcodeIsP2PHost();
  const isP2PJoiner = netEnabled && typeof netcodeIsP2PJoiner === "function" && netcodeIsP2PJoiner();

  if (isOnlineVersus && (isP2PHost || isP2PJoiner)) {
    // Experimental P2P host-authoritative mode.
    if (isP2PHost && typeof netP2PHostStepFrame === "function") {
      while (accumulatorMs >= SIM_FRAME_MS) {
        const frame = typeof simFrame !== "undefined" ? simFrame : 0;
        netP2PHostStepFrame(frame);
        simFrame++;
        accumulatorMs -= SIM_FRAME_MS;
      }
    } else if (isP2PJoiner) {
      // Joiner: send inputs to host and consume latest host state snapshots.
      if (typeof netP2PJoinerSendInput === "function") {
        while (accumulatorMs >= SIM_FRAME_MS) {
          const frame = typeof simFrame !== "undefined" ? simFrame : 0;
          netP2PJoinerSendInput(frame);
          simFrame++;
          accumulatorMs -= SIM_FRAME_MS;
        }
      } else {
        // Drain accumulator even if helper missing.
        while (accumulatorMs >= SIM_FRAME_MS) accumulatorMs -= SIM_FRAME_MS;
      }
      if (typeof netP2PGetLatestHostState === "function") {
        const s = netP2PGetLatestHostState();
        if (s && typeof loadState === "function") loadState(s);
      }
    }
  } else if (isOnlineVersus) {
    // Central server authoritative mode (current default): server provides opponent + combat.
    if (typeof netcodeSendInput === "function") netcodeSendInput();
    const hasState = typeof netcodeHasServerState === "function" && netcodeHasServerState();
    if (!hasState) {
      const interp = typeof netcodeGetInterpolatedState === "function" ? netcodeGetInterpolatedState(now) : null;
      if (interp && typeof loadState === "function") loadState(interp);
    }
    if (typeof netcodeApplyServerStateForOpponentAndCombat === "function") netcodeApplyServerStateForOpponentAndCombat();
    while (accumulatorMs >= SIM_FRAME_MS) {
      const simNow = simNowMs();
      let dtScaled = SIM_DT;
      if (simNow < koSlowmoUntil) dtScaled *= KO_SLOWMO_SCALE;
      const ourBits = typeof _localBitsForThisPeer === "function" ? _localBitsForThisPeer() | 0 : 0;
      const isHost = typeof netcodeGetStats === "function" && netcodeGetStats().role === "host";
      stepGameplay(dtScaled, simNow, isHost ? ourBits : 0, isHost ? 0 : ourBits);
      simFrame++;
      accumulatorMs -= SIM_FRAME_MS;
      if (typeof netcodeApplyServerStateForOpponentAndCombat === "function") netcodeApplyServerStateForOpponentAndCombat();
    }
  } else {
    const isJoiner = typeof netcodeIsEnabled === "function" && netcodeIsEnabled() && typeof netcodeGetStats === "function" && netcodeGetStats().role === "join";
    if (!isJoiner) {
      while (accumulatorMs >= SIM_FRAME_MS) {
        const simNow = simNowMs();
        let dtScaled = SIM_DT;
        if (simNow < koSlowmoUntil) dtScaled *= KO_SLOWMO_SCALE;
        stepGameplay(dtScaled, simNow);
        simFrame++;
        accumulatorMs -= SIM_FRAME_MS;
      }
    }
  }
  draw(now);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
