import type { SpriteFrame } from '../../types';

const _ = '';
const HAIR = '#8d6e63';
const HAIR_D = '#6d4c41';
const SKIN = '#ffcc80';
const SKIN_S = '#e6b06e';
const EYE_W = '#ffffff';
const PUPIL = '#1a1a1a';
const MOUTH = '#c62828';
const SHIRT = '#ef5350';
const SHIRT_D = '#c62828';
const PANTS = '#37474f';
const PANTS_D = '#263238';
const SHOE = '#4e342e';

const idleFrame1: SpriteFrame = [
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR, HAIR_D, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR_D, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, SKIN, EYE_W, EYE_W, PUPIL, SKIN, PUPIL, EYE_W, EYE_W, SKIN, _, _, _, _],
  [_, _, _, SKIN, EYE_W, EYE_W, PUPIL, SKIN, PUPIL, EYE_W, EYE_W, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, MOUTH, MOUTH, MOUTH, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, SHIRT, SHIRT, SHIRT_D, SHIRT, SHIRT_D, SHIRT, SHIRT, _, _, _, _, _],
  [_, _, _, SKIN, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SKIN, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS_D, _, PANTS_D, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

const idleFrame2: SpriteFrame = [
  [_, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR_D, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _, _],
  [_, _, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR_D, HAIR, _, _, _, _, _],
  [_, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, SKIN, EYE_W, EYE_W, PUPIL, SKIN, PUPIL, EYE_W, EYE_W, SKIN, _, _, _, _],
  [_, _, _, SKIN, EYE_W, PUPIL, EYE_W, SKIN, EYE_W, PUPIL, EYE_W, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, SKIN, MOUTH, MOUTH, MOUTH, MOUTH, MOUTH, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, SHIRT, SHIRT, SHIRT_D, SHIRT, SHIRT_D, SHIRT, SHIRT, _, _, _, _, _],
  [_, _, _, SKIN, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SKIN, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS_D, PANTS, _, PANTS, PANTS_D, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

const panicFrame1: SpriteFrame = [
  [_, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _],
  [_, _, HAIR_D, HAIR, HAIR, HAIR_D, HAIR_D, HAIR, HAIR_D, HAIR, HAIR, HAIR_D, _, _, _, _],
  [_, HAIR, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR_D, HAIR, HAIR, HAIR, _, _, _],
  [_, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, SKIN, EYE_W, EYE_W, PUPIL, SKIN, SKIN, SKIN, PUPIL, EYE_W, EYE_W, SKIN, _, _, _],
  [_, _, SKIN, EYE_W, EYE_W, PUPIL, SKIN, SKIN, SKIN, PUPIL, EYE_W, EYE_W, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, MOUTH, MOUTH, MOUTH, MOUTH, MOUTH, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, SKIN, _, SHIRT, SHIRT_D, SHIRT, SHIRT, SHIRT, SHIRT_D, SHIRT, _, SKIN, _, _, _],
  [_, SKIN, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, SKIN, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, PANTS, PANTS, _, _, _, PANTS, PANTS, _, _, _, _, _],
  [_, _, _, _, PANTS_D, PANTS, _, _, _, PANTS, PANTS_D, _, _, _, _, _],
  [_, _, _, _, SHOE, SHOE, _, _, _, SHOE, SHOE, _, _, _, _, _],
];

const panicFrame2: SpriteFrame = [
  [_, _, HAIR_D, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR_D, _, _, _, _],
  [_, HAIR, HAIR, HAIR_D, HAIR, HAIR_D, HAIR, HAIR_D, HAIR, HAIR_D, HAIR, HAIR, HAIR, _, _, _],
  [_, _, HAIR, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, SKIN, EYE_W, EYE_W, PUPIL, SKIN, SKIN, SKIN, PUPIL, EYE_W, EYE_W, SKIN, _, _, _],
  [_, _, SKIN, EYE_W, PUPIL, EYE_W, SKIN, SKIN, SKIN, EYE_W, PUPIL, EYE_W, SKIN, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, _, MOUTH, MOUTH, MOUTH, MOUTH, MOUTH, MOUTH, MOUTH, _, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, SKIN, SHIRT, SHIRT_D, SHIRT, SHIRT, SHIRT, SHIRT_D, SHIRT, SKIN, _, _, _, _],
  [_, _, SKIN, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, SKIN, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS_D, _, PANTS_D, PANTS, _, _, _, _, _, _],
  [_, _, _, _, SHOE, SHOE, _, _, _, SHOE, SHOE, _, _, _, _, _],
];

const standingFrame1: SpriteFrame = [
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR, HAIR_D, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR_D, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, SKIN, EYE_W, EYE_W, PUPIL, SKIN, PUPIL, EYE_W, EYE_W, SKIN, _, _, _, _],
  [_, _, _, SKIN, EYE_W, EYE_W, PUPIL, SKIN, PUPIL, EYE_W, EYE_W, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SKIN, MOUTH, MOUTH, SKIN, SKIN, _, _, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, SHIRT, SHIRT, SHIRT_D, SHIRT, SHIRT_D, SHIRT, SHIRT, _, _, _, _, _],
  [_, _, _, SKIN, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SKIN, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS_D, _, PANTS_D, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

const standingFrame2: SpriteFrame = [
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, SKIN, EYE_W, EYE_W, PUPIL, SKIN, PUPIL, EYE_W, EYE_W, SKIN, _, _, _, _],
  [_, _, _, SKIN, EYE_W, EYE_W, PUPIL, SKIN, PUPIL, EYE_W, EYE_W, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SKIN, SKIN, MOUTH, MOUTH, SKIN, _, _, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, SHIRT, SHIRT, SHIRT_D, SHIRT, SHIRT_D, SHIRT, SHIRT, _, _, _, _, _],
  [_, _, _, SKIN, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, SKIN, _, _, _, _],
  [_, _, _, _, _, SHIRT, SHIRT, SHIRT, SHIRT, SHIRT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS_D, PANTS, _, PANTS, PANTS_D, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

export const PANIC_PETE_FRAMES: Record<string, SpriteFrame[]> = {
  idle: [idleFrame1, idleFrame2],
  panic: [panicFrame1, panicFrame2],
  standing: [standingFrame1, standingFrame2],
};
