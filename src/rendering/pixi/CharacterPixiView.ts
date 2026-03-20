import { Application, Sprite, Container } from 'pixi.js';
import type { AnimationState } from '../../types';
import { SpriteSheet } from '../SpriteSheet';
import { Animator } from '../Animator';
import { buildTextureAtlas, evictTexturesByPrefix } from './spriteFrameToTexture';
import type { SpriteFrameSet } from '../SpriteSheet';

export interface CharacterPixiViewOptions {
  /** Parent DOM element to mount the canvas into */
  parent: HTMLElement;
  /** Display width in pixels (e.g. 64 or 128) */
  width: number;
  /** Display height in pixels */
  height: number;
  /** Scale factor for sprite (16 * scale = pixel size). Default 4 for 64px. */
  scale?: number;
  /** Sprite frames for this character */
  frames: SpriteFrameSet;
  /** Initial animation state */
  initialState?: AnimationState;
  /** Optional cache prefix for texture atlas (e.g. character id) */
  cachePrefix?: string;
  /** Background color as hex number. Default 0x07090f */
  backgroundColor?: number;
  /** If true, background is transparent. Overrides backgroundColor. */
  transparent?: boolean;
}

/**
 * PixiJS-based character view. Renders pixel-art character sprites with smooth
 * animations, optional glow, and crisp scaling.
 */
export class CharacterPixiView {
  private app: Application | null = null;
  private sprite: Sprite | null = null;
  private container: Container | null = null;
  private animator: Animator | null = null;
  private textureAtlas: Map<string, import('pixi.js').Texture> | null = null;
  private tickCallback: ((ticker: { deltaMS: number }) => void) | null = null;
  private options: CharacterPixiViewOptions;
  private _animationState: AnimationState;
  /** Set to true the moment destroy() is called so an in-flight mount() can abort */
  private _destroyed = false;

  constructor(options: CharacterPixiViewOptions) {
    this.options = {
      scale: 4,
      initialState: 'idle',
      backgroundColor: 0x07090f,
      ...options,
    };
    this._animationState = this.options.initialState ?? 'idle';
  }

  async mount(): Promise<void> {
    const { parent, width, height, scale = 4, frames, cachePrefix = '' } = this.options;

    this.textureAtlas = buildTextureAtlas(frames, cachePrefix, scale);
    const spriteSheet = new SpriteSheet(frames);
    this.animator = new Animator(spriteSheet, this._animationState);

    const app = new Application();
    const transparent = this.options.transparent ?? false;
    await app.init({
      width,
      height,
      backgroundColor: transparent ? 0x0 : (this.options.backgroundColor ?? 0x07090f),
      backgroundAlpha: transparent ? 0 : 1,
      resolution: 1,
      antialias: false,
      autoStart: true,
      resizeTo: undefined,
      preference: 'webgl',
    });

    // If destroy() was called while we were awaiting app.init(), tear down immediately
    if (this._destroyed) {
      app.destroy(true, true);
      return;
    }

    this.app = app;

    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.imageRendering = 'pixelated';
    canvas.style.imageRendering = 'crisp-edges';
    parent.appendChild(canvas);

    this.container = new Container();
    this.app.stage.addChild(this.container);

    const firstTexture = this.getTextureForCurrentFrame();
    this.sprite = new Sprite(firstTexture);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.x = width / 2;
    this.sprite.y = height;
    this.sprite.scale.set(1);
    this.container.addChild(this.sprite);

    this.tickCallback = (ticker: { deltaMS: number }): void => {
      // Guard: stop ticking if the view has been destroyed
      if (this._destroyed || !this.app || !this.animator) return;
      this.animator.update(ticker.deltaMS);
      const tex = this.getTextureForCurrentFrame();
      if (this.sprite && tex && !tex.destroyed) {
        this.sprite.texture = tex;
      }
    };
    this.app.ticker.add(this.tickCallback);
  }

  private getTextureForCurrentFrame(): import('pixi.js').Texture | undefined {
    if (!this.animator || !this.textureAtlas) return undefined;
    const state = this.animator.getState();
    const frameIndex = this.animator.getFrameIndex();
    const key = `${this.options.cachePrefix ?? ''}${state}_${frameIndex}`;
    return this.textureAtlas.get(key);
  }

  setAnimationState(state: AnimationState): void {
    this._animationState = state;
    if (this.animator) {
      this.animator.setState(state);
    }
  }

  getAnimationState(): AnimationState {
    return this._animationState;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.app?.canvas as HTMLCanvasElement ?? null;
  }

  destroy(): void {
    // Mark destroyed first so any in-flight mount() or tick callback bails out
    this._destroyed = true;

    if (this.app) {
      if (this.tickCallback) {
        this.app.ticker.remove(this.tickCallback);
        this.tickCallback = null;
      }
      this.app.destroy(true, true);
      this.app = null;
    }

    // Evict this view's textures from the module-level cache so the next
    // mount() always creates fresh textures from a live WebGL context
    const prefix = this.options.cachePrefix ?? '';
    if (prefix) evictTexturesByPrefix(prefix);

    this.sprite = null;
    this.container = null;
    this.animator = null;
    this.textureAtlas = null;
  }
}
