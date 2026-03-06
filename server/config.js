"use strict";

// Server-side config: same constants as client config but no document/canvas.
// All values are attached to global so required client modules can use them.
const W = 1200;
const H = 700;

global.WORLD = { width: W, height: H };
global.PLATFORM = { width: 720, height: 24 };
global.PLATFORM.x = (W - global.PLATFORM.width) / 2;
global.PLATFORM.y = H * 0.7;

global.GRAVITY = 2200;
global.FAST_FALL_MULTIPLIER = 2.6;
global.MOVE_SPEED = 480;
global.FIRST_JUMP_VELOCITY = -1200;
global.DOUBLE_JUMP_VELOCITY = -900;
global.HORIZONTAL_DAMPING = 18;
global.BLAST_MARGIN = 200;

global.ATTACK_LIFETIME_MS = 100;
global.LIGHT = { base: 280, scaling: 2.0, damage: 5 };
global.HEAVY = { base: 400, scaling: 3.0, damage: 6 };
global.VULNERABILITY_AT_100_LIGHT = 1.5;
global.VULNERABILITY_AT_100_HEAVY = 2.8;

global.BLOCK_DAMAGE_MULT = 0.35;
global.BLOCK_KNOCKBACK_MULT = 0.45;
global.PARRY_WINDOW_MS = 80;
global.PARRY_LOCKOUT_MS = 350;
global.PARRY_KNOCKBACK_MULT = 0.1;
global.BLOCKSTUN_LIGHT_MS = 110;
global.BLOCKSTUN_HEAVY_MS = 180;
global.HITSTUN_LIGHT_MS = 130;
global.HITSTUN_HEAVY_MS = 200;
global.PARRY_STUN_ATTACKER_MS = 220;
global.LIGHT_COOLDOWN_MS = 200;
global.HEAVY_COOLDOWN_MS = 420;
global.SHORT_HOP_MAX_MS = 120;
global.SHORT_HOP_MULT = 0.65;
global.DASH_SPEED = 900;
global.ROLL_DURATION_MS = 220;

global.MAX_STOCKS = 3;
global.ROUND_TIME_SEC = 99;

global.HITSTOP_LIGHT_MS = 40;
global.HITSTOP_HEAVY_MS = 70;
global.HITSTOP_BLOCK_LIGHT_MS = 20;
global.HITSTOP_BLOCK_HEAVY_MS = 40;
global.HITSTOP_PARRY_MS = 100;
global.SHAKE_LIGHT = 2;
global.SHAKE_HEAVY = 4;
global.SHAKE_PARRY = 3;
global.SHAKE_KO = 12;
global.MAX_SHAKE_PIXELS = 8;
global.KO_SLOWMO_MS = 650;
global.KO_SLOWMO_SCALE = 0.35;
global.KO_FLASH_MS = 180;
global.RESPAWN_INVULN_MS = 1200;
global.RESPAWN_DELAY_MS = 700;
global.KILL_HINT_DAMAGE = 100;
global.COMBO_RESET_MS = 900;
