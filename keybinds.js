"use strict";

const P2_KEYBINDS_STORAGE = "minCombat_p2Keybinds";

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

let p2Keybinds = { ...P2_KEYBINDS_DEFAULT };

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
