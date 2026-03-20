import { PixelRenderer } from '../../rendering/PixelRenderer';
import type { Season, TimeOfDay } from '../../types';

export class WindowScene {
  drawOutdoorView(
    renderer: PixelRenderer,
    x: number,
    y: number,
    w: number,
    h: number,
    season: Season,
    timeOfDay: TimeOfDay,
  ): void {
    this.drawSky(renderer, x, y, w, h, timeOfDay);
    this.drawGround(renderer, x, y, w, h, season);
    this.drawTrees(renderer, x, y, w, h, season);
    this.drawTimeDetails(renderer, x, y, w, h, timeOfDay);
  }

  private drawSky(
    renderer: PixelRenderer,
    x: number,
    y: number,
    w: number,
    h: number,
    timeOfDay: TimeOfDay,
  ): void {
    const skyColors: Record<TimeOfDay, string[]> = {
      morning: ['#87ceeb', '#b3e5fc', '#e1f5fe'],
      afternoon: ['#42a5f5', '#64b5f6', '#90caf9'],
      dusk: ['#ff7043', '#ff8a65', '#ffab91', '#ce93d8'],
      night: ['#1a237e', '#283593', '#303f9f'],
    };

    const colors = skyColors[timeOfDay];
    const bandHeight = Math.floor(h * 0.7 / colors.length);

    for (let i = 0; i < colors.length; i++) {
      const bandY = y + i * bandHeight;
      const bandH = i === colors.length - 1
        ? Math.floor(h * 0.7) - i * bandHeight
        : bandHeight;
      renderer.drawRect(x, bandY, w, bandH, colors[i]);
    }

    if (timeOfDay === 'morning') {
      renderer.drawRect(x + w - 8, y + 2, 4, 4, '#fff9c4');
      renderer.drawRect(x + w - 9, y + 3, 6, 2, '#fff9c4');
      renderer.drawRect(x + w - 7, y + 1, 2, 6, '#fff9c4');
    }

    if (timeOfDay === 'night') {
      renderer.drawRect(x + 3, y + 2, 1, 1, '#ffffff');
      renderer.drawRect(x + 10, y + 4, 1, 1, '#ffffff');
      renderer.drawRect(x + 18, y + 1, 1, 1, '#ffffff');
      renderer.drawRect(x + 25, y + 3, 1, 1, '#ffffff');
      renderer.drawRect(x + 30, y + 2, 1, 1, '#ffffff');
      renderer.drawRect(x + 15, y + 5, 1, 1, '#b3e5fc');
      renderer.drawRect(x + 8, y + 6, 1, 1, '#b3e5fc');

      renderer.drawRect(x + w - 10, y + 2, 4, 4, '#fff9c4');
      renderer.drawRect(x + w - 9, y + 3, 2, 2, '#fdd835');
    }

    if (timeOfDay === 'dusk') {
      renderer.drawRect(x + 5, y + 2, 5, 3, '#ffcc80');
      renderer.drawRect(x + 4, y + 3, 7, 1, '#ffe0b2');
    }
  }

  private drawGround(
    renderer: PixelRenderer,
    x: number,
    y: number,
    w: number,
    h: number,
    season: Season,
  ): void {
    const groundY = y + Math.floor(h * 0.7);
    const groundH = h - Math.floor(h * 0.7);

    const groundColors: Record<Season, string> = {
      spring: '#66bb6a',
      summer: '#43a047',
      autumn: '#8d6e63',
      winter: '#eceff1',
    };

    const groundAccent: Record<Season, string> = {
      spring: '#81c784',
      summer: '#2e7d32',
      autumn: '#a1887f',
      winter: '#ffffff',
    };

    renderer.drawRect(x, groundY, w, groundH, groundColors[season]);

    for (let gx = x; gx < x + w; gx += 4) {
      renderer.drawRect(gx, groundY, 2, 1, groundAccent[season]);
    }

    if (season === 'spring') {
      renderer.drawRect(x + 5, groundY + 1, 1, 1, '#f48fb1');
      renderer.drawRect(x + 15, groundY + 2, 1, 1, '#fff176');
      renderer.drawRect(x + 28, groundY + 1, 1, 1, '#f48fb1');
    }

    if (season === 'winter') {
      renderer.drawRect(x + 2, groundY - 1, 3, 1, '#ffffff');
      renderer.drawRect(x + 12, groundY - 1, 4, 1, '#ffffff');
      renderer.drawRect(x + 25, groundY - 1, 3, 1, '#ffffff');
    }
  }

  private drawTrees(
    renderer: PixelRenderer,
    x: number,
    y: number,
    w: number,
    h: number,
    season: Season,
  ): void {
    const groundY = y + Math.floor(h * 0.7);
    const trunkColor = '#5d4037';

    const treePositions = [x + 6, x + 20, x + 32];

    for (const tx of treePositions) {
      renderer.drawRect(tx + 1, groundY - 5, 2, 5, trunkColor);

      switch (season) {
        case 'spring':
          renderer.drawRect(tx - 1, groundY - 9, 6, 5, '#f48fb1');
          renderer.drawRect(tx, groundY - 10, 4, 2, '#f8bbd0');
          renderer.drawRect(tx - 1, groundY - 7, 1, 1, '#f06292');
          renderer.drawRect(tx + 5, groundY - 8, 1, 1, '#f06292');
          break;
        case 'summer':
          renderer.drawRect(tx - 1, groundY - 9, 6, 5, '#388e3c');
          renderer.drawRect(tx, groundY - 10, 4, 2, '#4caf50');
          renderer.drawRect(tx + 1, groundY - 11, 2, 1, '#66bb6a');
          break;
        case 'autumn':
          renderer.drawRect(tx - 1, groundY - 9, 6, 5, '#e65100');
          renderer.drawRect(tx, groundY - 10, 4, 2, '#ff9800');
          renderer.drawRect(tx + 1, groundY - 11, 2, 1, '#f44336');
          renderer.drawRect(tx - 1, groundY - 6, 1, 1, '#ffb74d');
          renderer.drawRect(tx + 5, groundY - 7, 1, 1, '#ff7043');
          break;
        case 'winter':
          renderer.drawRect(tx, groundY - 7, 1, 2, trunkColor);
          renderer.drawRect(tx + 3, groundY - 7, 1, 2, trunkColor);
          renderer.drawRect(tx - 1, groundY - 6, 1, 1, trunkColor);
          renderer.drawRect(tx + 4, groundY - 6, 1, 1, trunkColor);
          renderer.drawRect(tx, groundY - 8, 4, 1, '#eceff1');
          renderer.drawRect(tx - 1, groundY - 6, 6, 1, '#eceff1');
          break;
      }
    }
  }

  private drawTimeDetails(
    renderer: PixelRenderer,
    x: number,
    y: number,
    w: number,
    h: number,
    timeOfDay: TimeOfDay,
  ): void {
    if (timeOfDay === 'afternoon') {
      renderer.drawRect(x + 5, y + 3, 6, 2, '#e0e0e0');
      renderer.drawRect(x + 4, y + 4, 8, 1, '#eeeeee');
      renderer.drawRect(x + 25, y + 5, 5, 2, '#e0e0e0');
      renderer.drawRect(x + 24, y + 6, 7, 1, '#eeeeee');
    }

    if (timeOfDay === 'dusk') {
      const groundY = y + Math.floor(h * 0.7);
      renderer.drawRect(x + 2, groundY - 1, 2, 1, '#4a148c');
      renderer.drawRect(x + 1, groundY - 2, 4, 1, '#4a148c');
    }
  }
}
