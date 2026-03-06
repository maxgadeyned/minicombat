"use strict";

// Load server config and stubs first (set globals), then game modules.
require("./config.js");
require("./stubs.js");
require("../entities.js");
require("../attacks.js");
require("../specials.js");
require("../physics.js");
require("../game.js");

const DT = 1 / 60;
const FRAME_MS = 1000 / 60;

/**
 * Run one simulation step. state is the current state (from loadState/saveState shape).
 * p1Bits, p2Bits are input bitmasks for this frame.
 * Returns the new state (same shape as saveState()).
 */
function step(state, p1Bits, p2Bits) {
  global.loadState(state);
  global.gameState = global.GAME_STATE.VERSUS;
  const frame = state.simFrame | 0;
  const now = frame * FRAME_MS;
  global.stepGameplay(DT, now, p1Bits || 0, p2Bits || 0);
  return global.saveState();
}

module.exports = { step };
