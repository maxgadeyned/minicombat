"use strict";

// Stubs so client game code can run in Node (no audio/DOM).
global.playSfx = function () {};
global.updateHUD = function () {};
if (typeof global.performance === "undefined") {
  global.performance = { now: () => Date.now() };
}
global.GAME_STATE = {
  TITLE: "title",
  MENU: "menu",
  ONLINE_MENU: "online_menu",
  ONLINE_LOBBY: "online_lobby",
  ONLINE_HOST: "online_host",
  ONLINE_JOIN: "online_join",
  PRACTICE: "practice",
  VERSUS_SELECT: "versus_select",
  VERSUS_INTRO: "versus_intro",
  TRANSITION: "transition",
  VERSUS: "versus",
  P1_SETTINGS: "p1_settings",
  P2_SETTINGS: "p2_settings",
  SETTINGS: "settings",
  CREDITS: "credits",
};
global.gameState = global.GAME_STATE.VERSUS;
global.hitEffects = [];
