"use strict";

let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; }
}

function playSfx(type) {
  if (!audioCtx) ensureAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  let freq = 440, duration = 0.08;
  switch (type) {
    case "hitLight": freq = 500; duration = 0.09; break;
    case "hitHeavy": freq = 260; duration = 0.13; break;
    case "block": freq = 320; duration = 0.06; break;
    case "parry": freq = 800; duration = 0.14; break;
    case "jump": freq = 600; duration = 0.07; break;
    case "land": freq = 220; duration = 0.08; break;
    case "trap": freq = 380; duration = 0.05; break;
    case "blocked": freq = 180; duration = 0.06; break;
    default: break;
  }
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

