"use strict";

// Shared simulation core.
// This file defines the canonical match state shape and stepState signature
// so both browser and server can agree on what a "state" looks like.

/**
 * Create a fresh match state.
 * Later we'll pass in options (mode, stage, characters, etc.) via config.
 */
function createInitialState(config) {
  const state = {
    simFrame: 0,

    // Entities (copied from game.js saveState)
    player: null,      // will be a fighter object
    player2: null,     // null in practice / 1P modes
    dummy: null,       // used in practice

    // Global match state
    playerStocks: 3,
    player2Stocks: 3,
    dummyStocks: 3,
    roundOver: false,
    roundOverSelection: 0,
    roundOverStartTime: 0,
    roundOverWinner: null,
    gamePaused: false,
    pauseMenuSelection: 0,
    bestComboCount: 0,
    bestComboDamage: 0,
    currentComboCount: 0,
    currentComboDamage: 0,
    lastComboHitTime: 0,
    dummyMode: 1,
    dummyNextAttackAt: 0,

    // Tutorial flags (used only in practice/tutorial)
    tutorialMode: false,
    tutorialStep: 0,
    tutorialMoveStartX: 0,
    tutorialJumpStartGround: false,
    tutorialHeavyDone: false,
    tutorialSpecialDone: false,
    tutorialComplete: false,
    tutorialCompleteAt: 0,

    // FX / hitstop
    hitstopUntil: 0,
    shakeUntil: 0,
    shakeMagnitude: 0,
    koSlowmoUntil: 0,
    koFlashUntil: 0,

    // Deterministic input bookkeeping
    p1InputBits: 0,
    p2InputBits: 0,
    p1PrevInputBits: 0,
    p2PrevInputBits: 0,
    p1LastJumpPressAt: 0,
    p2LastJumpPressAt: 0,

    // Collections
    activeHitboxes: [],
    hitEffects: [],

    // Optional: keep original config for reference (stage, characters, etc.)
    config: config || {},
  };

  return state;
}

/**
 * Advance one simulation step.
 * For now this is a stub; later we'll port your real stepGameplay logic here.
 *
 * @param {object} state - SimState, as created by createInitialState / derived from saveState.
 * @param {{ p1Bits: number, p2Bits: number }} inputs - input bitmasks for this frame.
 * @param {number} dt - delta time in seconds (e.g. 1/60).
 * @param {number} nowMs - simulation time in ms (e.g. frame * (1000/60)).
 */
function stepState(state, inputs, dt, nowMs) {
  // TODO: copy logic from stepGameplay / physics / combat, rewritten to use `state`
  // instead of global variables.
  // For now, just bump simFrame so we can wire the call from both browser and server.
  state.simFrame = (state.simFrame | 0) + 1;
  return state;
}

module.exports = {
  createInitialState,
  stepState,
};