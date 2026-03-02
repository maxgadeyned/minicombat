"use strict";

const P2_KEYBINDS_STORAGE = "minCombat_p2Keybinds";
const P1_SOLO_KEYBINDS_STORAGE = "minCombat_p1SoloKeybinds";
const P1_LOCAL_KEYBINDS_STORAGE = "minCombat_p1LocalKeybinds";

const P2_KEYBINDS_DEFAULT = {
  moveLeft: "KeyJ",
  moveRight: "KeyL",
  jump: "Minus",
  fastFall: "KeyK",
  dash: "KeyI",
  special: "KeyO",
  heavy: "KeyP",
  block: "Quote",
};

const P1_SOLO_DEFAULT = { moveLeft: "KeyA", moveRight: "KeyD", jump: "Space", fastFall: "KeyS", dash: "KeyQ", special: "KeyJ", heavy: "KeyK", block: "KeyL" };
const P1_LOCAL_DEFAULT = { moveLeft: "KeyA", moveRight: "KeyD", jump: "Space", fastFall: "KeyS", dash: "KeyQ", special: "KeyX", heavy: "KeyC", block: "KeyV" };

let p2Keybinds = { ...P2_KEYBINDS_DEFAULT };
let p1SoloKeybinds = { ...P1_SOLO_DEFAULT };
let p1LocalKeybinds = { ...P1_LOCAL_DEFAULT };

function loadP2Keybinds() {
  try {
    const stored = localStorage.getItem(P2_KEYBINDS_STORAGE);
    if (stored) {
      const parsed = JSON.parse(stored);
      p2Keybinds = { ...P2_KEYBINDS_DEFAULT, ...parsed };
    }
  } catch (_) {}
}

function saveP2Keybinds() {
  try {
    localStorage.setItem(P2_KEYBINDS_STORAGE, JSON.stringify(p2Keybinds));
  } catch (_) {}
}

function resetP2Keybinds() {
  p2Keybinds = { ...P2_KEYBINDS_DEFAULT };
  saveP2Keybinds();
}

function loadP1SoloKeybinds() {
  try {
    const stored = localStorage.getItem(P1_SOLO_KEYBINDS_STORAGE);
    if (stored) {
      const parsed = JSON.parse(stored);
      p1SoloKeybinds = { ...P1_SOLO_DEFAULT, ...parsed };
    }
  } catch (_) {}
}

function saveP1SoloKeybinds() {
  try {
    localStorage.setItem(P1_SOLO_KEYBINDS_STORAGE, JSON.stringify(p1SoloKeybinds));
  } catch (_) {}
}

function loadP1LocalKeybinds() {
  try {
    const stored = localStorage.getItem(P1_LOCAL_KEYBINDS_STORAGE);
    if (stored) {
      const parsed = JSON.parse(stored);
      p1LocalKeybinds = { ...P1_LOCAL_DEFAULT, ...parsed };
    }
  } catch (_) {}
}

function saveP1LocalKeybinds() {
  try {
    localStorage.setItem(P1_LOCAL_KEYBINDS_STORAGE, JSON.stringify(p1LocalKeybinds));
  } catch (_) {}
}

function getP1Keybinds(profile) {
  return profile === "local" ? { ...p1LocalKeybinds } : { ...p1SoloKeybinds };
}

function setP1Keybind(profile, action, code) {
  const obj = profile === "local" ? p1LocalKeybinds : p1SoloKeybinds;
  obj[action] = code;
  if (profile === "local") saveP1LocalKeybinds();
  else saveP1SoloKeybinds();
}

function resetP1SoloKeybinds() {
  p1SoloKeybinds = { ...P1_SOLO_DEFAULT };
  saveP1SoloKeybinds();
}

function resetP1LocalKeybinds() {
  p1LocalKeybinds = { ...P1_LOCAL_DEFAULT };
  saveP1LocalKeybinds();
}

function codeToDisplay(code) {
  if (!code) return "?";
  if (code === "Minus") return "-";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "Quote") return "'";
  if (code === "Backquote") return "`";
  if (code === "BracketLeft") return "[";
  if (code === "BracketRight") return "]";
  if (code === "Semicolon") return ";";
  if (code === "Comma") return ",";
  if (code === "Period") return ".";
  if (code === "Slash") return "/";
  if (code === "IntlBackslash") return "\\";
  return code;
}

function getP1KeybindConflict(profile, action, code) {
  const obj = profile === "local" ? p1LocalKeybinds : p1SoloKeybinds;
  for (const k of Object.keys(obj)) {
    if (k !== action && obj[k] === code) return k;
  }
  return null;
}

function getP2KeybindConflict(action, code) {
  for (const k of Object.keys(p2Keybinds)) {
    if (k !== action && p2Keybinds[k] === code) return k;
  }
  return null;
}

function isP2Key(e) {
  const code = e.code;
  return (
    code === p2Keybinds.moveLeft ||
    code === p2Keybinds.moveRight ||
    code === p2Keybinds.jump ||
    code === p2Keybinds.fastFall ||
    code === p2Keybinds.dash ||
    code === p2Keybinds.special ||
    code === p2Keybinds.heavy ||
    code === p2Keybinds.block
  );
}

loadP2Keybinds();
loadP1SoloKeybinds();
loadP1LocalKeybinds();
