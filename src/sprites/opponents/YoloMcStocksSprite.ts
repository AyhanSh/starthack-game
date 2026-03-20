import type { SpriteFrame } from '../../types';

const _ = '';
const HAIR = '#ffd600';
const HAIR_D = '#f9a825';
const SKIN = '#ffcc80';
const SKIN_S = '#e6b06e';
const EYE = '#1a1a1a';
const EYE_W = '#ffffff';
const MOUTH = '#c62828';
const SHIRT = '#7c4dff';
const SHIRT_D = '#6200ea';
const ROCKET = '#ff5722';
const ROCKET_T = '#ffd600';
const PANTS = '#37474f';
const PANTS_D = '#263238';
const SHOE = '#e65100';

const idleFrame1: SpriteFrame = [
  [_, _, _, _, _, _, HAIR, HAIR, HAIR, _, _, _, _, _, _, _],
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR_D, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, HAIR, HAIR, _, HAIR, _, HAIR, _, HAIR, HAIR, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, SKIN, EYE_W, EYE, SKIN, SKIN, SKIN, EYE, EYE_W, SKIN, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SKIN, MOUTH, MOUTH, MOUTH, SKIN, _, _, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, SHIRT, SHIRT, ROCKET, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _],
  [_, _, _, SKIN, SHIRT, ROCKET, ROCKET_T, ROCKET, SHIRT, SHIRT, SHIRT, SKIN, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT_D, SHIRT, SHIRT_D, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS_D, _, PANTS_D, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

const idleFrame2: SpriteFrame = [
  [_, _, _, _, _, _, HAIR, HAIR, HAIR, _, _, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _, _],
  [_, _, _, _, HAIR_D, HAIR, HAIR, HAIR, HAIR, HAIR_D, HAIR, _, _, _, _, _],
  [_, _, _, HAIR, _, HAIR, _, HAIR, _, HAIR, _, HAIR, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, SKIN, EYE, EYE_W, SKIN, SKIN, SKIN, EYE_W, EYE, SKIN, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, MOUTH, MOUTH, MOUTH, MOUTH, MOUTH, _, _, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, SHIRT, SHIRT, ROCKET, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _],
  [_, _, _, SKIN, SHIRT, ROCKET, ROCKET_T, ROCKET, SHIRT, SHIRT, SHIRT, SKIN, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT_D, SHIRT, SHIRT_D, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS_D, PANTS, _, PANTS, PANTS_D, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

const bounceFrame1: SpriteFrame = [
  [_, _, _, _, _, _, HAIR, HAIR, HAIR, _, _, _, _, _, _, _],
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR_D, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, HAIR, HAIR, _, HAIR, _, HAIR, _, HAIR, HAIR, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, SKIN, EYE_W, EYE, SKIN, SKIN, SKIN, EYE, EYE_W, SKIN, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, MOUTH, MOUTH, MOUTH, MOUTH, MOUTH, _, _, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, SKIN, _, SHIRT, SHIRT, ROCKET, SHIRT, SHIRT, SHIRT, SHIRT, _, SKIN, _, _, _],
  [_, SKIN, _, _, SHIRT, ROCKET, ROCKET_T, ROCKET, SHIRT, SHIRT, SHIRT, _, _, SKIN, _, _],
  [_, _, _, _, _, SHIRT, SHIRT_D, SHIRT, SHIRT_D, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

const bounceFrame2: SpriteFrame = [
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, HAIR, HAIR, HAIR, _, _, _, _, _, _, _],
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR_D, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, HAIR, HAIR, _, HAIR, _, HAIR, _, HAIR, HAIR, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, SKIN, EYE_W, EYE, SKIN, SKIN, SKIN, EYE, EYE_W, SKIN, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, MOUTH, MOUTH, MOUTH, MOUTH, MOUTH, _, _, _, _, _, _],
  [_, _, SKIN, _, SHIRT, SHIRT, ROCKET, SHIRT, SHIRT, SHIRT, SHIRT, _, SKIN, _, _, _],
  [_, SKIN, _, _, SHIRT, ROCKET, ROCKET_T, ROCKET, SHIRT, SHIRT, SHIRT, _, _, SKIN, _, _],
  [_, _, _, _, _, SHIRT, SHIRT_D, SHIRT, SHIRT_D, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, PANTS, PANTS_D, _, _, _, PANTS_D, PANTS, _, _, _, _, _],
  [_, _, _, _, SHOE, SHOE, _, _, _, SHOE, SHOE, _, _, _, _, _],
];

const standingFrame1: SpriteFrame = [
  [_, _, _, _, _, _, HAIR, HAIR, HAIR, _, _, _, _, _, _, _],
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR_D, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, HAIR, HAIR, _, HAIR, _, HAIR, _, HAIR, HAIR, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, SKIN, EYE_W, EYE, SKIN, SKIN, SKIN, EYE, EYE_W, SKIN, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SKIN, MOUTH, MOUTH, SKIN, SKIN, _, _, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, SHIRT, SHIRT, ROCKET, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _],
  [_, _, _, SKIN, SHIRT, ROCKET, ROCKET_T, ROCKET, SHIRT, SHIRT, SHIRT, SKIN, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT_D, SHIRT, SHIRT_D, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS_D, _, PANTS_D, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

const standingFrame2: SpriteFrame = [
  [_, _, _, _, _, _, HAIR, HAIR, HAIR, _, _, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _, _],
  [_, _, _, _, HAIR_D, HAIR, HAIR, HAIR, HAIR, HAIR_D, HAIR, _, _, _, _, _],
  [_, _, _, HAIR, _, HAIR, _, HAIR, _, HAIR, _, HAIR, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, SKIN, EYE, EYE_W, SKIN, SKIN, SKIN, EYE_W, EYE, SKIN, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SKIN, SKIN, MOUTH, MOUTH, SKIN, _, _, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, SHIRT, SHIRT, ROCKET, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _],
  [_, _, _, SKIN, SHIRT, ROCKET, ROCKET_T, ROCKET, SHIRT, SHIRT, SHIRT, SKIN, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT_D, SHIRT, SHIRT_D, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS_D, PANTS, _, PANTS, PANTS_D, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

export const YOLO_FRAMES: Record<string, SpriteFrame[]> = {
  idle: [idleFrame1, idleFrame2],
  bounce: [bounceFrame1, bounceFrame2],
  standing: [standingFrame1, standingFrame2],
};
