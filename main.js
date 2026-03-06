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

  // Server-authoritative (HaxBall-style): in online versus nobody runs the sim; both send input and apply server state.
  const isOnlineVersus = typeof netcodeIsEnabled === "function" && netcodeIsEnabled() && gameState === GAME_STATE.VERSUS;
  if (isOnlineVersus && typeof netcodeSendInput === "function") {
    netcodeSendInput();
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
