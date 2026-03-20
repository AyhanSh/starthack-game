import type { SpriteFrame, AnimationState } from '../types';

export type SpriteFrameSet = Record<AnimationState, SpriteFrame[]>;

export class SpriteSheet {
  private frames: Partial<SpriteFrameSet>;

  constructor(frames: Partial<SpriteFrameSet>) {
    this.frames = frames;
  }

  getFrames(state: AnimationState): SpriteFrame[] {
    return this.frames[state] ?? this.frames['idle'] ?? [[]];
  }

  getFrame(state: AnimationState, index: number): SpriteFrame {
    const frames = this.getFrames(state);
    return frames[index % frames.length];
  }

  hasState(state: AnimationState): boolean {
    return state in this.frames && (this.frames[state]?.length ?? 0) > 0;
  }

  getStates(): AnimationState[] {
    return Object.keys(this.frames) as AnimationState[];
  }
}
