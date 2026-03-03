"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const dummyDamageLabel = document.getElementById("dummyDamage");
const playerDamageLabel = document.getElementById("playerDamage");

// ---------- CONFIG ----------
const WORLD = { width: canvas.width, height: canvas.height };

const PLATFORM = { width: 720, height: 24 };
PLATFORM.x = (WORLD.width - PLATFORM.width) / 2;
PLATFORM.y = WORLD.height * 0.7;

const GRAVITY = 2200;
const FAST_FALL_MULTIPLIER = 2.6;
const MOVE_SPEED = 480;
const FIRST_JUMP_VELOCITY = -1200;
const DOUBLE_JUMP_VELOCITY = -900;
const HORIZONTAL_DAMPING = 18;
const BLAST_MARGIN = 200;

const ATTACK_LIFETIME_MS = 100;
// Slightly increased base knockback for basic attacks for a snappier feel.
const LIGHT = { base: 280, scaling: 2.0, damage: 5 };
const HEAVY = { base: 400, scaling: 3.0, damage: 6 };
const VULNERABILITY_AT_100_LIGHT = 1.5;
const VULNERABILITY_AT_100_HEAVY = 2.8;

const BLOCK_DAMAGE_MULT = 0.35;
const BLOCK_KNOCKBACK_MULT = 0.45;
const PARRY_WINDOW_MS = 80;
const PARRY_LOCKOUT_MS = 350;
const PARRY_KNOCKBACK_MULT = 0.1;
const BLOCKSTUN_LIGHT_MS = 110;
const BLOCKSTUN_HEAVY_MS = 180;
const HITSTUN_LIGHT_MS = 130;
const HITSTUN_HEAVY_MS = 200;
const PARRY_STUN_ATTACKER_MS = 220;
const LIGHT_COOLDOWN_MS = 200;
const HEAVY_COOLDOWN_MS = 420;
const SHORT_HOP_MAX_MS = 120;
const SHORT_HOP_MULT = 0.65;
const DASH_SPEED = 900;
const ROLL_DURATION_MS = 220;

const MAX_STOCKS = 3;
const ROUND_TIME_SEC = 99;

const HITSTOP_LIGHT_MS = 40;
const HITSTOP_HEAVY_MS = 70;
const HITSTOP_BLOCK_LIGHT_MS = 20;
const HITSTOP_BLOCK_HEAVY_MS = 40;
const HITSTOP_PARRY_MS = 100;
const SHAKE_LIGHT = 2;
const SHAKE_HEAVY = 4;
const SHAKE_PARRY = 3;
const SHAKE_KO = 12;
const KO_SLOWMO_MS = 650;
const KO_SLOWMO_SCALE = 0.35;
const KO_FLASH_MS = 180;
const RESPAWN_INVULN_MS = 1200;
const RESPAWN_DELAY_MS = 700;
const KILL_HINT_DAMAGE = 100;

