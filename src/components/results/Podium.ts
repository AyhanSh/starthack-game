interface PodiumResult {
  name: string;
  score: number;
  isPlayer: boolean;
}

interface RankedResult extends PodiumResult {
  rank: number;
}

const RANK_HEIGHTS = [140, 180, 120, 80];
const RANK_COLORS = ['#c0c0c0', '#ffd700', '#cd7f32', '#546e7a'];
const RANK_LABELS = ['2ND', '1ST', '3RD', '4TH'];
const PODIUM_ORDER = [1, 0, 2, 3];

export class Podium {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private ranked: RankedResult[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.wrapper = document.createElement('div');
    this.wrapper.style.display = 'flex';
    this.wrapper.style.alignItems = 'flex-end';
    this.wrapper.style.justifyContent = 'center';
    this.wrapper.style.gap = '4px';
    this.wrapper.style.padding = '24px 0';
    this.wrapper.style.minHeight = '280px';
  }

  setResults(results: Array<{ name: string; score: number; isPlayer: boolean }>): void {
    const sorted = [...results].sort((a, b) => b.score - a.score);
    this.ranked = sorted.map((r, i) => ({ ...r, rank: i }));
    this.renderPodium();
  }

  private renderPodium(): void {
    this.wrapper.innerHTML = '';

    for (const displayIdx of PODIUM_ORDER) {
      const result = this.ranked[displayIdx];
      if (!result) continue;

      const col = document.createElement('div');
      col.style.display = 'flex';
      col.style.flexDirection = 'column';
      col.style.alignItems = 'center';
      col.style.gap = '4px';
      col.style.opacity = '0';
      col.style.transform = 'translateY(30px)';
      col.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';

      const sprite = this.drawMiniSprite(result.isPlayer, result.rank);
      col.appendChild(sprite);

      const nameEl = document.createElement('div');
      nameEl.textContent = result.name;
      nameEl.style.fontFamily = "'Press Start 2P', monospace";
      nameEl.style.fontSize = '7px';
      nameEl.style.color = result.isPlayer ? '#ffd700' : '#e8f4f8';
      nameEl.style.textAlign = 'center';
      nameEl.style.maxWidth = '80px';
      nameEl.style.overflow = 'hidden';
      nameEl.style.textOverflow = 'ellipsis';
      nameEl.style.whiteSpace = 'nowrap';
      col.appendChild(nameEl);

      const placard = document.createElement('div');
      placard.textContent = String(result.score);
      placard.style.fontFamily = "'Press Start 2P', monospace";
      placard.style.fontSize = '10px';
      placard.style.color = '#0a0e1a';
      placard.style.background = '#e8f4f8';
      placard.style.padding = '3px 8px';
      placard.style.border = '2px solid #0d2137';
      placard.style.boxShadow = '2px 2px 0px #546e7a';
      col.appendChild(placard);

      const height = RANK_HEIGHTS[result.rank] ?? 60;
      const pedestal = document.createElement('div');
      pedestal.style.width = '80px';
      pedestal.style.height = `${height}px`;
      pedestal.style.background = RANK_COLORS[result.rank] ?? '#546e7a';
      pedestal.style.display = 'flex';
      pedestal.style.alignItems = 'center';
      pedestal.style.justifyContent = 'center';
      pedestal.style.border = '3px solid #0d2137';
      pedestal.style.boxShadow = '4px 4px 0px #0a0e1a';

      const rankLabel = document.createElement('span');
      rankLabel.textContent = RANK_LABELS[result.rank] ?? '';
      rankLabel.style.fontFamily = "'Press Start 2P', monospace";
      rankLabel.style.fontSize = '12px';
      rankLabel.style.color = '#0a0e1a';
      pedestal.appendChild(rankLabel);

      col.appendChild(pedestal);
      this.wrapper.appendChild(col);

      const delay = PODIUM_ORDER.indexOf(displayIdx) * 400;
      setTimeout(() => {
        col.style.opacity = '1';
        col.style.transform = 'translateY(0)';
      }, delay);
    }
  }

  private drawMiniSprite(isPlayer: boolean, rank: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = 16;
    const cellSize = 4;
    canvas.width = size * cellSize;
    canvas.height = size * cellSize;
    canvas.style.width = `${size * cellSize}px`;
    canvas.style.height = `${size * cellSize}px`;
    canvas.style.imageRendering = 'pixelated';

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const skinColor = '#ffd5b0';
    const eyeColor = '#000000';

    let bodyColor: string;
    let hairColor: string;

    if (isPlayer) {
      bodyColor = '#40c4ff';
      hairColor = '#5C2E00';
    } else if (rank === 0) {
      bodyColor = '#ff6d00';
      hairColor = '#333333';
    } else if (rank === 1) {
      bodyColor = '#66bb6a';
      hairColor = '#8B4513';
    } else {
      bodyColor = '#ce93d8';
      hairColor = '#1a1a1a';
    }

    const draw = (x: number, y: number, color: string): void => {
      ctx.fillStyle = color;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    };

    for (let x = 6; x <= 9; x++) draw(x, 2, hairColor);
    for (let x = 5; x <= 10; x++) draw(x, 3, hairColor);

    for (let x = 6; x <= 9; x++) draw(x, 4, skinColor);
    for (let x = 6; x <= 9; x++) draw(x, 5, skinColor);
    draw(7, 4, eyeColor);
    draw(9, 4, eyeColor);

    for (let x = 5; x <= 10; x++) {
      for (let y = 6; y <= 10; y++) {
        draw(x, y, bodyColor);
      }
    }

    draw(4, 7, skinColor);
    draw(4, 8, skinColor);
    draw(11, 7, skinColor);
    draw(11, 8, skinColor);

    for (let y = 11; y <= 13; y++) {
      draw(6, y, bodyColor);
      draw(7, y, bodyColor);
      draw(9, y, bodyColor);
      draw(10, y, bodyColor);
    }

    draw(6, 14, '#333333');
    draw(7, 14, '#333333');
    draw(9, 14, '#333333');
    draw(10, 14, '#333333');

    return canvas;
  }

  render(): void {
    this.container.appendChild(this.wrapper);
  }

  destroy(): void {
    this.wrapper.remove();
  }
}
