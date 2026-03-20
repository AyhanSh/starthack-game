import type { SpriteFrame } from '../types';

export class PixelRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private logicalWidth: number;
  private logicalHeight: number;
  private cellSize: number;

  constructor(canvas: HTMLCanvasElement, logicalWidth: number, logicalHeight: number, cellSize: number) {
    this.canvas = canvas;
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
    this.cellSize = cellSize;

    canvas.width = logicalWidth * cellSize;
    canvas.height = logicalHeight * cellSize;
    canvas.style.imageRendering = 'pixelated';

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  clear(color = '#0a0e1a'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawCell(lx: number, ly: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(lx * this.cellSize, ly * this.cellSize, this.cellSize, this.cellSize);
  }

  drawRect(lx: number, ly: number, lw: number, lh: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      lx * this.cellSize,
      ly * this.cellSize,
      lw * this.cellSize,
      lh * this.cellSize
    );
  }

  drawSprite(sprite: SpriteFrame, lx: number, ly: number): void {
    for (let row = 0; row < sprite.length; row++) {
      for (let col = 0; col < sprite[row].length; col++) {
        const color = sprite[row][col];
        if (color && color !== '' && color !== 'transparent') {
          this.drawCell(lx + col, ly + row, color);
        }
      }
    }
  }

  drawText(text: string, lx: number, ly: number, color: string, pixelSize = 1): void {
    const PIXEL_FONT: Record<string, number[][]> = {
      'A': [[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
      'B': [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,1],[1,1,1,0]],
      'C': [[0,1,1,1],[1,0,0,0],[1,0,0,0],[1,0,0,0],[0,1,1,1]],
      'D': [[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
      'E': [[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,1,1,1]],
      'F': [[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
      'G': [[0,1,1,1],[1,0,0,0],[1,0,1,1],[1,0,0,1],[0,1,1,1]],
      'H': [[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
      'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
      'J': [[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,0]],
      'K': [[1,0,0,1],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,0,0,1]],
      'L': [[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,1,1,1]],
      'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
      'N': [[1,0,0,1],[1,1,0,1],[1,0,1,1],[1,0,0,1],[1,0,0,1]],
      'O': [[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
      'P': [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
      'Q': [[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,1,0],[0,1,0,1]],
      'R': [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,1,0],[1,0,0,1]],
      'S': [[0,1,1,1],[1,0,0,0],[0,1,1,0],[0,0,0,1],[1,1,1,0]],
      'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
      'U': [[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
      'V': [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0]],
      'W': [[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
      'X': [[1,0,0,1],[0,1,1,0],[0,1,1,0],[0,1,1,0],[1,0,0,1]],
      'Y': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
      'Z': [[1,1,1,1],[0,0,1,0],[0,1,0,0],[1,0,0,0],[1,1,1,1]],
      '0': [[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
      '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
      '2': [[0,1,1,0],[1,0,0,1],[0,0,1,0],[0,1,0,0],[1,1,1,1]],
      '3': [[1,1,1,0],[0,0,0,1],[0,1,1,0],[0,0,0,1],[1,1,1,0]],
      '4': [[1,0,0,1],[1,0,0,1],[1,1,1,1],[0,0,0,1],[0,0,0,1]],
      '5': [[1,1,1,1],[1,0,0,0],[1,1,1,0],[0,0,0,1],[1,1,1,0]],
      '6': [[0,1,1,0],[1,0,0,0],[1,1,1,0],[1,0,0,1],[0,1,1,0]],
      '7': [[1,1,1,1],[0,0,0,1],[0,0,1,0],[0,1,0,0],[0,1,0,0]],
      '8': [[0,1,1,0],[1,0,0,1],[0,1,1,0],[1,0,0,1],[0,1,1,0]],
      '9': [[0,1,1,0],[1,0,0,1],[0,1,1,1],[0,0,0,1],[0,1,1,0]],
      ' ': [[0,0],[0,0],[0,0],[0,0],[0,0]],
      '.': [[0],[0],[0],[0],[1]],
      ',': [[0],[0],[0],[1],[1]],
      '!': [[1],[1],[1],[0],[1]],
      '?': [[0,1,1,0],[1,0,0,1],[0,0,1,0],[0,0,0,0],[0,0,1,0]],
      ':': [[0],[1],[0],[1],[0]],
      '-': [[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
      '+': [[0,0,0],[0,1,0],[1,1,1],[0,1,0],[0,0,0]],
      '%': [[1,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,1]],
      '$': [[0,1,1],[1,1,0],[0,1,1],[0,1,0],[1,1,0]],
      '/': [[0,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,0]],
      '(': [[0,1],[1,0],[1,0],[1,0],[0,1]],
      ')': [[1,0],[0,1],[0,1],[0,1],[1,0]],
      "'": [[1],[1],[0],[0],[0]],
      '"': [[1,0,1],[1,0,1],[0,0,0],[0,0,0],[0,0,0]],
    };

    let offsetX = 0;
    const upper = text.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      const ch = upper[i];
      const glyph = PIXEL_FONT[ch];
      if (glyph) {
        for (let row = 0; row < glyph.length; row++) {
          for (let col = 0; col < glyph[row].length; col++) {
            if (glyph[row][col]) {
              for (let py = 0; py < pixelSize; py++) {
                for (let px = 0; px < pixelSize; px++) {
                  this.drawCell(lx + offsetX + col * pixelSize + px, ly + row * pixelSize + py, color);
                }
              }
            }
          }
        }
        offsetX += (glyph[0].length + 1) * pixelSize;
      } else {
        offsetX += 4 * pixelSize;
      }
    }
  }

  setScale(scale: number): void {
    this.cellSize = scale;
    this.canvas.width = this.logicalWidth * this.cellSize;
    this.canvas.height = this.logicalHeight * this.cellSize;
    this.ctx.imageSmoothingEnabled = false;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getCellSize(): number {
    return this.cellSize;
  }
}
