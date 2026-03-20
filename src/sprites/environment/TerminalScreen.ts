import { PixelRenderer } from '../../rendering/PixelRenderer';

export class TerminalScreen {
  private renderer: PixelRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new PixelRenderer(canvas, 120, 90, 4);
  }

  drawBezel(): void {
    this.renderer.drawRect(0, 0, 120, 90, '#424242');

    this.renderer.drawRect(0, 0, 120, 2, '#616161');
    this.renderer.drawRect(0, 88, 120, 2, '#303030');
    this.renderer.drawRect(0, 0, 2, 90, '#616161');
    this.renderer.drawRect(118, 0, 2, 90, '#303030');

    this.renderer.drawRect(2, 2, 116, 86, '#37474f');

    this.renderer.drawRect(3, 3, 114, 84, '#263238');

    this.renderer.drawRect(4, 4, 112, 82, '#0a1a12');

    this.renderer.drawRect(4, 4, 112, 1, '#0d2818');
    this.renderer.drawRect(4, 85, 112, 1, '#061208');
    this.renderer.drawRect(4, 4, 1, 82, '#0d2818');
    this.renderer.drawRect(115, 4, 1, 82, '#061208');

    this.drawCornerCurve(4, 4, false, false);
    this.drawCornerCurve(113, 4, true, false);
    this.drawCornerCurve(4, 83, false, true);
    this.drawCornerCurve(113, 83, true, true);

    for (let sy = 6; sy < 84; sy += 3) {
      this.renderer.drawRect(5, sy, 110, 1, '#0d1f14');
    }

    this.renderer.drawRect(0, 0, 1, 1, '#303030');
    this.renderer.drawRect(119, 0, 1, 1, '#303030');
    this.renderer.drawRect(0, 89, 1, 1, '#212121');
    this.renderer.drawRect(119, 89, 1, 1, '#212121');

    this.renderer.drawRect(56, 88, 8, 1, '#4caf50');

    this.renderer.drawRect(3, 88, 3, 1, '#616161');
    this.renderer.drawRect(114, 88, 3, 1, '#616161');
  }

  private drawCornerCurve(
    cx: number,
    cy: number,
    flipX: boolean,
    flipY: boolean,
  ): void {
    const bg = '#263238';
    const offsets = [
      [0, 0], [1, 0], [0, 1],
    ];

    for (const [dx, dy] of offsets) {
      const px = flipX ? cx + 2 - dx : cx + dx;
      const py = flipY ? cy + 2 - dy : cy + dy;
      this.renderer.drawRect(px, py, 1, 1, bg);
    }
  }

  drawScreenContent(
    contentFn: (renderer: PixelRenderer, x: number, y: number, w: number, h: number) => void,
  ): void {
    this.drawBezel();
    contentFn(this.renderer, 5, 5, 110, 80);
  }

  getRenderer(): PixelRenderer {
    return this.renderer;
  }
}
