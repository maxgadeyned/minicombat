"use strict";

// This module is meant to contain ONLY pure simulation logic – no DOM, no canvas, no audio.

// Types:
//
// - SimState: plain JS object with everything needed to simulate a match
// - SimInputs: { p1Bits: number, p2Bits: number }

function createInitialState(config) {
  // For now we just return a shallow placeholder; we’ll hook into your real state next.
  return {
    // You’ll later copy your existing state fields in here (player, player2, stocks, etc.)
    config: config || {},
  };
}

function stepState(state, inputs, dt, nowMs) {
  // This will eventually call your real physics/combat logic.
  // For now, keep it as a no-op so we can wire it from both client and server without breaking anything.
  // Example signature: inputs = { p1Bits: number, p2Bits: number }
  return state;
}

module.exports = {
  createInitialState,
  stepState,
};