"use strict";

function createFighter(options) {
  return {
    pos: { x: options.x, y: options.y },
    prevPos: { x: options.x, y: options.y },
    vel: { x: 0, y: 0 },
    size: { w: options.w, h: options.h },
    color: options.color,
    onGround: false,
    facing: 1,
    damage: 0,
    jumpsRemaining: 2,
    blocking: false,
    parryWindowUntil: 0,
    parryLockoutUntil: 0,
    stunnedUntil: 0,
    parryFlashUntil: 0,
    nextLightAt: 0,
    nextHeavyAt: 0,
    rollingUntil: 0,
    rollInvulnUntil: 0,
    lastJumpWasDouble: false,
    moveSpeed: options.moveSpeed || MOVE_SPEED,
    firstJumpVel: options.firstJumpVel || FIRST_JUMP_VELOCITY,
    doubleJumpVel: options.doubleJumpVel || DOUBLE_JUMP_VELOCITY,
    weight: options.weight || 1.0,
    name: options.name || "Archer",
    archetype: options.archetype || "archer",
    nextSpecialAt: 0,
  };
}

const playerStart = { x: WORLD.width * 0.3, y: PLATFORM.y - 60 };
const dummyStart = { x: WORLD.width * 0.7, y: PLATFORM.y - 60 };

let player = createFighter({ x: playerStart.x, y: playerStart.y, w: 40, h: 70, color: "#3da1ff", archetype: "archer", name: "Archer" });
let dummy = createFighter({
  x: dummyStart.x, y: dummyStart.y, w: 40, h: 80, color: "#ff4b5c",
  name: "Training Dummy", moveSpeed: MOVE_SPEED * 0.9,
  firstJumpVel: FIRST_JUMP_VELOCITY * 0.9, doubleJumpVel: DOUBLE_JUMP_VELOCITY * 0.9, weight: 1.2,
  archetype: "dummy",
});
dummy.isDummy = true;

let playerTypeIndex = 0;
const PLAYER_TYPES = [
  { label: "Archer", archetype: "archer", color: "#3da1ff", w: 40, h: 70, moveSpeed: MOVE_SPEED, firstJumpVel: FIRST_JUMP_VELOCITY, doubleJumpVel: DOUBLE_JUMP_VELOCITY, weight: 1.0 },
  { label: "Bruiser", archetype: "bruiser", color: "#ffb347", w: 48, h: 68, moveSpeed: MOVE_SPEED * 1.15, firstJumpVel: FIRST_JUMP_VELOCITY * 1.05, doubleJumpVel: DOUBLE_JUMP_VELOCITY * 1.0, weight: 1.2 },
  { label: "Mage", archetype: "mage", color: "#c678dd", w: 36, h: 74, moveSpeed: MOVE_SPEED * 0.9, firstJumpVel: FIRST_JUMP_VELOCITY * 1.1, doubleJumpVel: DOUBLE_JUMP_VELOCITY * 1.05, weight: 0.9 },
];

function applyPlayerType(index) {
  playerTypeIndex = index % PLAYER_TYPES.length;
  const type = PLAYER_TYPES[playerTypeIndex];
  player.moveSpeed = type.moveSpeed;
  player.firstJumpVel = type.firstJumpVel;
  player.doubleJumpVel = type.doubleJumpVel;
  player.weight = type.weight;
  player.name = type.label;
  player.archetype = type.archetype;
  if (type.color) player.color = type.color;
  if (type.w != null) player.size.w = type.w;
  if (type.h != null) player.size.h = type.h;
}

let currentComboCount = 0;
let lastComboHitTime = 0;
let currentComboDamage = 0;
const COMBO_RESET_MS = 900;

