import type { SpriteFrame } from '../../types';

const _ = '';
const HAIR = '#5d4037';
const HAIR_D = '#3e2723';
const SKIN = '#ffcc80';
const SKIN_S = '#e6b06e';
const GLASS = '#ffd700';
const GLASS_L = '#ffe082';
const EYE = '#1a1a1a';
const SUIT = '#1565c0';
const SUIT_D = '#0d47a1';
const SUIT_L = '#1976d2';
const PANTS = '#0d47a1';
const PANTS_D = '#09326b';
const SHOE = '#212121';
const PIE_R = '#f44336';
const PIE_G = '#4caf50';
const PIE_B = '#2196f3';
const MOUTH = '#c62828';

const idleFrame1: SpriteFrame = [
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, EYE, GLASS, SKIN, GLASS, EYE, GLASS, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, GLASS, GLASS, GLASS_L, GLASS, GLASS, GLASS, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SKIN, SKIN, MOUTH, SKIN, SKIN, _, _, _, _, _, _],
  [_, _, _, _, _, SUIT, SUIT, SUIT, SUIT, SUIT, _, _, _, _, _, _],
  [_, _, _, _, SUIT, SUIT, SUIT_D, SUIT, SUIT_D, SUIT, SUIT, _, _, _, _, _],
  [_, _, _, SKIN, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, PIE_R, PIE_G, _, _, _],
  [_, _, _, _, _, SUIT, SUIT_L, SUIT, SUIT_L, SUIT, _, PIE_B, PIE_R, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS_D, _, PANTS_D, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

const idleFrame2: SpriteFrame = [
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR_D, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, EYE, GLASS, SKIN, GLASS, EYE, GLASS, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, GLASS, GLASS, GLASS_L, GLASS, GLASS, GLASS, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SKIN, MOUTH, MOUTH, SKIN, SKIN, _, _, _, _, _, _],
  [_, _, _, _, _, SUIT, SUIT, SUIT, SUIT, SUIT, _, _, _, _, _, _],
  [_, _, _, _, SUIT, SUIT, SUIT_D, SUIT, SUIT_D, SUIT, SUIT, _, _, _, _, _],
  [_, _, _, SKIN, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, PIE_G, PIE_R, _, _, _],
  [_, _, _, _, _, SUIT, SUIT_L, SUIT, SUIT_L, SUIT, _, PIE_R, PIE_B, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS_D, PANTS, _, PANTS, PANTS_D, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

const walkingFrame1: SpriteFrame = [
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, EYE, GLASS, SKIN, GLASS, EYE, GLASS, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, GLASS, GLASS, GLASS_L, GLASS, GLASS, GLASS, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SKIN, SKIN, MOUTH, SKIN, SKIN, _, _, _, _, _, _],
  [_, _, _, _, _, SUIT, SUIT, SUIT, SUIT, SUIT, _, _, _, _, _, _],
  [_, _, _, _, SUIT, SUIT, SUIT_D, SUIT, SUIT_D, SUIT, SUIT, _, _, _, _, _],
  [_, _, _, SKIN, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, PIE_R, PIE_G, _, _, _],
  [_, _, _, _, _, SUIT, SUIT_L, SUIT, SUIT_L, SUIT, _, PIE_B, PIE_R, _, _, _],
  [_, _, _, _, PANTS, PANTS, _, _, _, PANTS, PANTS, _, _, _, _, _],
  [_, _, _, _, PANTS_D, PANTS, _, _, _, PANTS, PANTS_D, _, _, _, _, _],
  [_, _, _, _, SHOE, SHOE, _, _, _, _, SHOE, SHOE, _, _, _, _],
];

const walkingFrame2: SpriteFrame = [
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR_D, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, EYE, GLASS, SKIN, GLASS, EYE, GLASS, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, GLASS, GLASS, GLASS_L, GLASS, GLASS, GLASS, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SKIN, MOUTH, MOUTH, SKIN, SKIN, _, _, _, _, _, _],
  [_, _, _, _, _, SUIT, SUIT, SUIT, SUIT, SUIT, _, _, _, _, _, _],
  [_, _, _, _, SUIT, SUIT, SUIT_D, SUIT, SUIT_D, SUIT, SUIT, _, _, _, _, _],
  [_, _, _, SKIN, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, PIE_G, PIE_B, _, _, _],
  [_, _, _, _, _, SUIT, SUIT_L, SUIT, SUIT_L, SUIT, _, PIE_R, PIE_G, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS_D, _, PANTS_D, PANTS, _, _, _, _, _, _],
  [_, _, _, _, SHOE, SHOE, _, _, _, SHOE, SHOE, _, _, _, _, _],
];

const standingFrame1: SpriteFrame = [
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR_D, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, EYE, GLASS, SKIN, GLASS, EYE, GLASS, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, GLASS, GLASS, GLASS_L, GLASS, GLASS, GLASS, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SKIN, SKIN, MOUTH, SKIN, SKIN, _, _, _, _, _, _],
  [_, _, _, _, _, SUIT, SUIT, SUIT, SUIT, SUIT, _, _, _, _, _, _],
  [_, _, _, SKIN, SUIT, SUIT, SUIT_D, SUIT, SUIT_D, SUIT, SUIT, SKIN, _, _, _, _],
  [_, _, _, _, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, _, _, _, _, _],
  [_, _, _, _, _, SUIT, SUIT_L, SUIT, SUIT_L, SUIT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS_D, _, PANTS_D, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

const standingFrame2: SpriteFrame = [
  [_, _, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _, _],
  [_, _, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR_D, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR_D, HAIR, _, _, _, _],
  [_, _, _, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, HAIR, _, _, _, _],
  [_, _, _, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, EYE, GLASS, SKIN, GLASS, EYE, GLASS, SKIN, _, _, _, _],
  [_, _, _, SKIN, GLASS, GLASS, GLASS, GLASS_L, GLASS, GLASS, GLASS, SKIN, _, _, _, _],
  [_, _, _, _, SKIN, SKIN, SKIN, SKIN_S, SKIN, SKIN, SKIN, _, _, _, _, _],
  [_, _, _, _, _, SKIN, MOUTH, MOUTH, SKIN, SKIN, _, _, _, _, _, _],
  [_, _, _, _, _, SUIT, SUIT, SUIT, SUIT, SUIT, _, _, _, _, _, _],
  [_, _, _, SKIN, SUIT, SUIT, SUIT_D, SUIT, SUIT_D, SUIT, SUIT, SKIN, _, _, _, _],
  [_, _, _, _, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, SUIT, _, _, _, _, _],
  [_, _, _, _, _, SUIT, SUIT_L, SUIT, SUIT_L, SUIT, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS, PANTS, _, PANTS, PANTS, _, _, _, _, _, _],
  [_, _, _, _, _, PANTS_D, PANTS, _, PANTS, PANTS_D, _, _, _, _, _, _],
  [_, _, _, _, _, SHOE, SHOE, _, SHOE, SHOE, _, _, _, _, _, _],
];

export const DORA_FRAMES: Record<string, SpriteFrame[]> = {
  idle: [idleFrame1, idleFrame2],
  walking: [walkingFrame1, walkingFrame2],
  standing: [standingFrame1, standingFrame2],
};
