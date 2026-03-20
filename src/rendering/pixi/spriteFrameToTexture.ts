import { Texture } from 'pixi.js';
import type { SpriteFrame, AnimationState } from '../../types';
import type { SpriteFrameSet } from '../SpriteSheet';

const CELL_SIZE = 4; // 16 * 4 = 64px per frame

/**
 * Draws a 16x16 sprite frame to a canvas at 64px (4x scale) with pixel-perfect rendering.
 */
function drawFrameToCanvas(
  canvas: HTMLCanvasElement,
  frame: SpriteFrame,
  cellSize: number = CELL_SIZE
): void {
  const rows = frame.length;
  const cols = rows > 0 ? frame[0].length : 0;
  const w = cols * cellSize;
  const h = rows * cellSize;

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const color = frame[row]?.[col];
      if (color && color !== '' && color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }
}

const textureCache = new Map<string, Texture>();

/**
 * Creates a Pixi Texture from a sprite frame. Textures are cached by cacheKey.
 */
export function spriteFrameToTexture(
  frame: SpriteFrame,
  cacheKey: string,
  cellSize: number = CELL_SIZE
): Texture {
  const existing = textureCache.get(cacheKey);
  // Return cached texture only if it hasn't been destroyed
  if (existing && !existing.destroyed) return existing;

  // Remove stale destroyed entry if present
  if (existing) textureCache.delete(cacheKey);

  const canvas = document.createElement('canvas');
  drawFrameToCanvas(canvas, frame, cellSize);
  const texture = Texture.from(canvas, true);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Prebuilds all textures for a sprite frame set. Returns a map of "state_frameIndex" -> Texture.
 * @param cellSize - Pixel size per logical cell (4 = 64px, 8 = 128px)
 */
export function buildTextureAtlas(
  frames: SpriteFrameSet,
  prefix: string = '',
  cellSize: number = CELL_SIZE
): Map<string, Texture> {
  const atlas = new Map<string, Texture>();
  const states = Object.keys(frames) as AnimationState[];

  for (const state of states) {
    const stateFrames = frames[state] ?? frames['idle'] ?? [];
    for (let i = 0; i < stateFrames.length; i++) {
      const frame = stateFrames[i];
      if (!frame) continue;
      const key = `${prefix}${state}_${i}_${cellSize}`;
      const texture = spriteFrameToTexture(frame, key, cellSize);
      atlas.set(`${prefix}${state}_${i}`, texture);
    }
  }

  return atlas;
}

/**
 * Removes all cache entries whose key starts with the given prefix and destroys
 * their underlying textures. Call this when a CharacterPixiView is destroyed so
 * the next mount always creates fresh textures from a live WebGL context.
 */
export function evictTexturesByPrefix(prefix: string): void {
  for (const [key, tex] of textureCache.entries()) {
    if (key.startsWith(prefix)) {
      if (!tex.destroyed) tex.destroy(true);
      textureCache.delete(key);
    }
  }
}

/**
 * Clears the entire texture cache (call on full game reset).
 */
export function clearTextureCache(): void {
  for (const tex of textureCache.values()) {
    if (!tex.destroyed) tex.destroy(true);
  }
  textureCache.clear();
}
