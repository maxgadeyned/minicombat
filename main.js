// Entry point: game loop and startup. All game logic lives in the split files.
"use strict";

let lastTime = performance.now();
function loop(now) {
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  let dt = Math.min(rawDt, 1 / 30);
  if (now < koSlowmoUntil) dt *= KO_SLOWMO_SCALE;
  if (!roundOver) {
    handlePlayerInput(dt, now);
    integrateFighter(player, dt);
    integrateFighter(dummy, dt);
    resolvePlayerDummyCollision();
    applyBlastZoneRespawn(dummy, true);
    applyBlastZoneRespawn(player, false);
    handleCombat(dt, now);
    handleDummyAI(now);
    roundTimeRemaining -= dt;
    if (roundTimeRemaining <= 0) {
      roundTimeRemaining = 0;
      roundOver = true;
    }
  }
  draw(now);
  requestAnimationFrame(loop);
}

updateHUD();
requestAnimationFrame(loop);
