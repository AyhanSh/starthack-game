import { PixelRenderer } from '../../rendering/PixelRenderer';
import { WindowScene } from './WindowScene';
import type { Season, TimeOfDay } from '../../types';
import { RoomAnimations } from '../../animations/RoomAnimations';

export class RoomScene {
  private renderer: PixelRenderer;
  private windowScene: WindowScene;
  private anim: RoomAnimations;

  constructor(canvas: HTMLCanvasElement) {
    // Higher logical resolution for more scene detail:
    // 240x180 logical cells @ 2px per cell = 480x360 canvas output.
    this.renderer = new PixelRenderer(canvas, 240, 180, 2);
    this.windowScene = new WindowScene();
    this.anim = new RoomAnimations();
  }

  update(deltaMs: number): void {
    this.anim.update(deltaMs);
  }

  draw(season: Season, timeOfDay: TimeOfDay, portfolioHealth: number, isCrash: boolean): void {
    this.renderer.clear('#0b1220');
    this.drawWall(timeOfDay);
    this.drawCeiling();
    this.drawFloorTiles();
    this.drawCarpet();
    this.drawWindow(season, timeOfDay);
    this.drawDoor();
    this.drawPlant(portfolioHealth);
    this.drawDeskAndProps();
    this.drawMonitor(this.anim.getMonitorFlicker());
    this.drawBooksStack();

    // Ambient effects
    this.anim.drawSteam(this.renderer);
    this.drawCat(isCrash);
  }

  getRenderer(): PixelRenderer {
    return this.renderer;
  }

  private drawWall(timeOfDay: TimeOfDay): void {
    // Warmer, reference-like office interior
    const isWarm = timeOfDay === 'dusk';
    const wallBase = isWarm ? '#caa08b' : '#bfa58f';
    const wallShadow = isWarm ? '#a67f6f' : '#9d7f70';
    this.renderer.drawRect(0, 0, 240, 124, wallBase);

    // Light tile-like wall panels
    for (let y = 12; y < 124; y += 10) {
      this.renderer.drawRect(0, y, 240, 1, '#b58f7d');
    }
    for (let x = 12; x < 240; x += 16) {
      this.renderer.drawRect(x, 0, 1, 124, 'rgba(181, 143, 125, 0.85)');
    }

    // Baseboard
    this.renderer.drawRect(0, 124, 240, 3, wallShadow);
    this.renderer.drawRect(0, 127, 240, 1, '#8c6a5c');

    // Micro shading for depth
    for (let x = 0; x < 240; x += 3) {
      if (x % 9 === 0) this.renderer.drawCell(x, 123, 'rgba(0,0,0,0.08)');
    }
  }

  private drawCeiling(): void {
    // Subtle ceiling panels at very top
    this.renderer.drawRect(0, 0, 240, 20, '#d7b29b');
    for (let x = 0; x < 240; x += 24) {
      this.renderer.drawRect(x, 0, 1, 20, '#c7a08f');
    }
    this.renderer.drawRect(0, 19, 240, 1, '#b58f7d');
    // Extra ceiling seams for detail
    for (let y = 4; y < 20; y += 5) {
      this.renderer.drawRect(0, y, 240, 1, 'rgba(207, 170, 149, 0.8)');
    }
  }

  private drawFloorTiles(): void {
    // Warm tile floor like reference
    this.renderer.drawRect(0, 130, 240, 50, '#b87955');
    // grout
    for (let x = 0; x < 240; x += 24) {
      this.renderer.drawRect(x, 130, 1, 50, '#8f5e45');
    }
    for (let y = 130; y < 180; y += 20) {
      this.renderer.drawRect(0, y, 240, 1, '#8f5e45');
    }
    // subtle shading toward bottom
    this.renderer.drawRect(0, 166, 240, 14, '#a66f51');

    // Tile texture speckles (adds detail)
    for (let x = 4; x < 240; x += 13) {
      const y = 136 + (x % 27);
      this.renderer.drawCell(x, y, '#c3835d');
      if (x % 2 === 0) this.renderer.drawCell(x + 1, y + 6, '#a96f4f');
    }
  }

  private drawWindow(season: Season, timeOfDay: TimeOfDay): void {
    // Large panoramic window
    const wx = 36;
    const wy = 24;
    const ww = 184;
    const wh = 68;

    // Frame
    this.renderer.drawRect(wx - 2, wy - 2, ww + 4, wh + 4, '#8b5a3c');
    this.renderer.drawRect(wx - 1, wy - 1, ww + 2, wh + 2, '#6f442d');

    // Outdoor view
    this.windowScene.drawOutdoorView(this.renderer, wx, wy, ww, wh, season, timeOfDay);

    // Dividers (like reference center split)
    this.renderer.drawRect(wx + Math.floor(ww / 2) - 2, wy, 4, wh, '#7b4e34');
    this.renderer.drawRect(wx, wy + Math.floor(wh / 2) - 2, ww, 4, '#7b4e34');

    // Glass highlight lines
    this.renderer.drawRect(wx + 2, wy + 2, ww - 4, 1, 'rgba(255,255,255,0.15)');
    this.renderer.drawRect(wx + 2, wy + 4, ww - 10, 1, 'rgba(255,255,255,0.08)');

    // Window sill + shadow
    this.renderer.drawRect(wx - 2, wy + wh + 2, ww + 4, 3, '#8c6a5c');
    this.renderer.drawRect(wx - 2, wy + wh + 5, ww + 4, 2, 'rgba(0,0,0,0.18)');
  }

  private drawCarpet(): void {
    // Soft rug centered like reference
    const x = 40;
    const y = 140;
    const w = 152;
    const h = 32;
    this.renderer.drawRect(x, y, w, h, '#e8d8bf');
    // fuzzy edge pixels
    for (let i = 0; i < w; i += 4) {
      this.renderer.drawCell(x + i, y, '#d8c5aa');
      this.renderer.drawCell(x + i + 1, y + h - 1, '#d8c5aa');
    }
    for (let j = 0; j < h; j += 4) {
      this.renderer.drawCell(x, y + j, '#d8c5aa');
      this.renderer.drawCell(x + w - 1, y + j + 1, '#d8c5aa');
    }

    // Inner weave lines
    for (let i = 6; i < w - 6; i += 12) {
      this.renderer.drawRect(x + i, y + 6, 1, h - 12, 'rgba(150, 120, 90, 0.12)');
    }

    // Rug shadow on floor (adds depth)
    this.renderer.drawRect(x + 2, y + h, w - 2, 2, 'rgba(0,0,0,0.15)');
  }

  private drawDoor(): void {
    // Left door
    this.renderer.drawRect(4, 36, 24, 88, '#7a4a32');
    this.renderer.drawRect(6, 38, 20, 84, '#8b5a3c');
    this.renderer.drawRect(6, 38, 20, 2, '#a66f51');
    // handle
    this.renderer.drawRect(22, 80, 2, 4, '#cfd8dc');
    this.renderer.drawRect(24, 81, 1, 2, '#90a4ae');
  }

  private drawBooksStack(): void {
    // Books stack near desk
    this.renderer.drawRect(108, 140, 20, 8, '#8b5a3c');
    this.renderer.drawRect(110, 138, 20, 6, '#a45b3c');
    this.renderer.drawRect(112, 136, 20, 6, '#7b3c2a');
    this.renderer.drawRect(112, 136, 6, 1, '#e8d8bf');
  }

  private drawDeskAndProps(): void {
    // Desk on right side (reference-like)
    const dx = 140;
    const dy = 96;
    const dw = 88;
    const dh = 40;

    // tabletop
    this.renderer.drawRect(dx, dy, dw, 6, '#b06b44');
    this.renderer.drawRect(dx, dy, dw, 2, '#d58b5b');
    // body
    this.renderer.drawRect(dx, dy + 6, dw, dh - 6, '#8b4f34');
    // drawers
    this.renderer.drawRect(dx + 8, dy + 14, 20, 24, '#7a442d');
    this.renderer.drawRect(dx + 60, dy + 14, 20, 24, '#7a442d');
    for (let i = 0; i < 3; i++) {
      this.renderer.drawRect(dx + 12, dy + 18 + i * 7, 12, 1, '#6a3a27');
      this.renderer.drawRect(dx + 64, dy + 18 + i * 7, 12, 1, '#6a3a27');
    }
    // legs shadow
    this.renderer.drawRect(dx + 8, dy + dh - 2, 20, 2, '#6a3a27');
    this.renderer.drawRect(dx + 60, dy + dh - 2, 20, 2, '#6a3a27');

    // keyboard
    this.renderer.drawRect(dx + 32, dy + 20, 24, 4, '#d0d7de');
    this.renderer.drawRect(dx + 32, dy + 20, 24, 1, '#eef2f6');
    // keys
    for (let k = 0; k < 20; k += 3) {
      this.renderer.drawCell(dx + 34 + k, dy + 22, '#b0bec5');
    }

    // box
    this.renderer.drawRect(dx + 8, dy + 8, 14, 10, '#caa08b');
    this.renderer.drawRect(dx + 8, dy + 8, 14, 2, '#e1c0aa');
    this.renderer.drawRect(dx + 9, dy + 12, 12, 1, '#b58f7d');

    // lamp
    this.renderer.drawRect(dx + 68, dy + 6, 4, 14, '#caa08b');
    this.renderer.drawRect(dx + 64, dy + 4, 12, 4, '#ffcf66');
    this.renderer.drawRect(dx + 62, dy + 2, 16, 2, '#ffd98a');

    // mug
    this.renderer.drawRect(dx + 76, dy + 16, 8, 8, '#f5f5f5');
    this.renderer.drawRect(dx + 78, dy + 18, 4, 4, '#6d4c41');
    this.renderer.drawRect(dx + 84, dy + 18, 2, 4, '#f5f5f5');
    // steam origin used by RoomAnimations (around x~42,y~50 in old coords) — keep near mug
    // We'll let RoomAnimations draw steam; positions roughly align in screen space.
  }

  private drawMonitor(flicker: number): void {
    // CRT monitor sitting on desk (right side)
    const mx = 170;
    const my = 58;
    const mw = 36;
    const mh = 28;

    this.renderer.drawRect(mx, my, mw, mh, '#7c8a93');
    this.renderer.drawRect(mx + 1, my + 1, mw - 2, mh - 2, '#4b5962');

    // Screen glow with flicker
    const glowStrength = Math.floor(40 + flicker * 70);
    const glowAlpha = glowStrength.toString(16).padStart(2, '0');
    this.renderer.drawRect(mx + 3, my + 3, mw - 6, mh - 6, `#9ad7ff${glowAlpha}`);
    this.renderer.drawRect(mx + 2, my + 2, mw - 4, mh - 4, '#2a3a4a');

    // UI lines
    for (let y = my + 5; y < my + mh - 4; y += 3) {
      this.renderer.drawRect(mx + 5, y, mw - 10, 1, '#7fb3d5');
    }
    this.renderer.drawRect(mx + 6, my + 9, 14, 1, '#bfe8ff');
    this.renderer.drawRect(mx + 6, my + 15, 18, 1, '#bfe8ff');

    // Stand
    this.renderer.drawRect(mx + 14, my + mh, 8, 4, '#5b6a73');
    this.renderer.drawRect(mx + 10, my + mh + 3, 16, 2, '#3c4a53');
  }

  private drawPlant(portfolioHealth: number): void {
    // Left plant pot like reference
    this.renderer.drawRect(32, 112, 16, 12, '#8b4f34');
    this.renderer.drawRect(34, 114, 12, 8, '#6f3d28');
    this.renderer.drawRect(32, 112, 16, 2, '#a66f51');

    if (portfolioHealth > 50) {
      this.renderer.drawRect(38, 102, 4, 10, '#3fa34d');
      this.renderer.drawRect(34, 100, 4, 8, '#4caf50');
      this.renderer.drawRect(42, 100, 4, 8, '#4caf50');
      this.renderer.drawRect(32, 98, 6, 4, '#66bb6a');
      this.renderer.drawRect(42, 96, 6, 4, '#66bb6a');
      this.renderer.drawRect(36, 92, 10, 6, '#2e7d32');
      // Leaf highlights
      this.renderer.drawCell(40, 94, '#81c784');
      this.renderer.drawCell(35, 99, '#81c784');
    } else {
      this.renderer.drawRect(38, 104, 4, 4, '#8b5a3c');
      this.renderer.drawRect(34, 104, 4, 2, '#a66f51');
      this.renderer.drawRect(42, 106, 4, 2, '#a66f51');
    }
  }

  private drawCat(isCrash: boolean): void {
    const catColor = '#455a64';
    const catLight = '#607d8b';
    const catEar = '#37474f';

    if (isCrash) {
      this.renderer.drawRect(85, 49, 1, 2, catEar);
      this.renderer.drawRect(89, 49, 1, 2, catEar);

      this.renderer.drawRect(84, 51, 7, 4, catColor);
      this.renderer.drawRect(85, 52, 5, 2, catLight);

      this.renderer.drawRect(86, 51, 1, 1, '#ffd600');
      this.renderer.drawRect(88, 51, 1, 1, '#ffd600');
      this.renderer.drawRect(87, 52, 1, 1, '#ffab91');

      this.renderer.drawRect(86, 53, 3, 1, catColor);
      this.renderer.drawRect(90, 52, 3, 1, catColor);
      this.renderer.drawRect(92, 51, 1, 1, catColor);
    } else {
      // Put cat on rug
      this.renderer.drawRect(76, 152, 14, 6, catColor);
      this.renderer.drawRect(78, 154, 10, 2, catLight);

      this.renderer.drawRect(76, 152, 2, 2, catEar);
      this.renderer.drawRect(88, 152, 2, 2, catEar);

      this.renderer.drawRect(80, 154, 2, 2, '#212121');
      this.renderer.drawRect(86, 154, 2, 2, '#212121');
      this.renderer.drawRect(83, 156, 4, 1, '#ffab91');

      this.renderer.drawRect(90, 154, 6, 2, catColor);
      this.renderer.drawRect(94, 152, 2, 2, catColor);
    }
  }
}
