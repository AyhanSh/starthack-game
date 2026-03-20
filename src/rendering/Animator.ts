import type { AnimationState, SpriteFrame } from '../types';
import { SpriteSheet } from './SpriteSheet';

export class Animator {
  private spriteSheet: SpriteSheet;
  private currentState: AnimationState;
  private frameIndex: number;
  private frameTimer: number;
  private frameDuration: number;
  private blinkTimer: number;
  private isBlinking: boolean;

  constructor(spriteSheet: SpriteSheet, initialState: AnimationState = 'idle') {
    this.spriteSheet = spriteSheet;
    this.currentState = initialState;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.frameDuration = 300;
    this.blinkTimer = 0;
    this.isBlinking = false;
  }

  setState(state: AnimationState): void {
    if (this.currentState !== state) {
      this.currentState = state;
      this.frameIndex = 0;
      this.frameTimer = 0;
    }
  }

  setFrameDuration(ms: number): void {
    this.frameDuration = ms;
  }

  update(deltaMs: number): void {
    this.frameTimer += deltaMs;
    this.blinkTimer += deltaMs;

    if (this.frameTimer >= this.frameDuration) {
      this.frameTimer = 0;
      const frames = this.spriteSheet.getFrames(this.currentState);
      this.frameIndex = (this.frameIndex + 1) % frames.length;
    }

    if (this.blinkTimer >= 3000) {
      this.isBlinking = true;
      if (this.blinkTimer >= 3150) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    }
  }

  getCurrentFrame(): SpriteFrame {
    return this.spriteSheet.getFrame(this.currentState, this.frameIndex);
  }

  getState(): AnimationState {
    return this.currentState;
  }

  getIsBlinking(): boolean {
    return this.isBlinking;
  }

  getFrameIndex(): number {
    return this.frameIndex;
  }
}
