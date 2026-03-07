"use strict";

// Put your menu music MP3 in the same folder as index.html and name it menu-music.mp3
// (or change MENU_MUSIC_SRC below to your filename, e.g. "assets/my-track.mp3")
const MENU_MUSIC_SRC = "menu-music.mp3";
const AUDIO_STORAGE = "minCombat_audio";

let audioCtx = null;
let menuMusic = null;
let menuMusicPlaying = false;
let sfxGainNode = null;

let musicVolume = 80;
let effectsVolume = 80;

function loadAudioSettings() {
  try {
    const stored = localStorage.getItem(AUDIO_STORAGE);
    if (stored) {
      const parsed = JSON.parse(stored);
      musicVolume = Math.max(0, Math.min(100, parsed.musicVolume ?? 80));
      effectsVolume = Math.max(0, Math.min(100, parsed.effectsVolume ?? 80));
    }
  } catch (_) {}
}

function saveAudioSettings() {
  try {
    localStorage.setItem(AUDIO_STORAGE, JSON.stringify({ musicVolume, effectsVolume }));
  } catch (_) {}
}

function setMusicVolume(val) {
  musicVolume = Math.max(0, Math.min(100, val));
  saveAudioSettings();
  if (menuMusic) menuMusic.volume = musicVolume / 100;
}

function setEffectsVolume(val) {
  effectsVolume = Math.max(0, Math.min(100, val));
  saveAudioSettings();
  if (sfxGainNode) sfxGainNode.gain.setValueAtTime(effectsVolume / 100, audioCtx ? audioCtx.currentTime : 0);
}

function ensureAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; }
}

loadAudioSettings();

function initMenuMusic() {
  if (menuMusic) return;
  menuMusic = new Audio(MENU_MUSIC_SRC);
  menuMusic.loop = true;
  menuMusic.preload = "auto";
  menuMusic.volume = musicVolume / 100;
}

initMenuMusic();

function playMenuMusic() {
  initMenuMusic();
  if (menuMusicPlaying) return;
  const p = menuMusic.play();
  if (p && typeof p.then === "function") p.then(() => { menuMusicPlaying = true; }).catch(() => {});
  else menuMusicPlaying = true;
}

function stopMenuMusic() {
  if (!menuMusic) return;
  menuMusic.pause();
  menuMusic.currentTime = 0;
  menuMusicPlaying = false;
}

function playSfx(type) {
  if (!audioCtx) ensureAudio();
  if (!audioCtx) return;
  if (!sfxGainNode) {
    sfxGainNode = audioCtx.createGain();
    sfxGainNode.gain.setValueAtTime(effectsVolume / 100, audioCtx.currentTime);
    sfxGainNode.connect(audioCtx.destination);
  }
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  let freq = 440, duration = 0.08, vol = 0.14;
  switch (type) {
    case "hitLight": freq = 620; duration = 0.06; vol = 0.12; break;
    case "hitHeavy": freq = 180; duration = 0.16; vol = 0.2; break;
    case "block": freq = 280; duration = 0.07; vol = 0.1; break;
    case "parry": freq = 880; duration = 0.12; vol = 0.16; break;
    case "ko": freq = 200; duration = 0.25; vol = 0.22; break;
    case "jump": freq = 600; duration = 0.07; break;
    case "land": freq = 220; duration = 0.08; break;
    case "trap": freq = 380; duration = 0.05; break;
    case "blocked": freq = 180; duration = 0.06; break;
    case "menuSelect": freq = 660; duration = 0.04; vol = 0.08; break;
    case "menuConfirm": freq = 520; duration = 0.06; vol = 0.1; break;
    case "menuBack": freq = 420; duration = 0.05; vol = 0.08; break;
    default: break;
  }
  if (type === "ko") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + duration);
  } else {
    osc.frequency.setValueAtTime(freq, now);
  }
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(sfxGainNode);
  osc.start(now);
  osc.stop(now + duration);
}

