// Entry point: game loop and startup. All game logic lives in the split files.
"use strict";

let lastTime = performance.now();
function loop(now) {
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  const dt = Math.min(rawDt, 1 / 30);

  if (gameState === GAME_STATE.MENU) {
    drawMenu(now);
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.VERSUS_SELECT) {
    drawCharacterSelect(now);
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.TRANSITION) {
    updateTransition(now);
    drawTransition(now);
    requestAnimationFrame(loop);
    return;
  }
  if (gameState === GAME_STATE.P2_SETTINGS) {
    drawP2Settings(now);
    requestAnimationFrame(loop);
    return;
  }

  let dtScaled = dt;
  if (now < koSlowmoUntil) dtScaled *= KO_SLOWMO_SCALE;
  if (!roundOver && !gamePaused) {
    handlePlayerInput(dtScaled, now);
    integrateFighter(player, dtScaled);
    if (gameState === GAME_STATE.VERSUS && player2) {
      handlePlayer2Input(dtScaled, now);
      integrateFighter(player2, dtScaled);
      applyBlastZoneRespawn(player2, false);
    } else {
      integrateFighter(dummy, dtScaled);
      applyBlastZoneRespawn(dummy, true);
      handleDummyAI(now);
    }
    resolvePlayerDummyCollision();
    applyBlastZoneRespawn(player, false);
    handleCombat(dtScaled, now);
  }
  draw(now);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
