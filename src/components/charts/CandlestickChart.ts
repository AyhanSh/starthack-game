interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
}

export class CandlestickChart {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private candles: OHLC[] = [];

  constructor(container: HTMLElement, width: number = 120, height: number = 60) {
    this.container = container;
    this.width = width;
    this.height = height;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  update(prices: number[]): void {
    this.candles = this.pricesToOHLC(prices);
    this.draw();
  }

  private pricesToOHLC(prices: number[]): OHLC[] {
    const candles: OHLC[] = [];
    const groupSize = Math.max(1, Math.floor(prices.length / 20));

    for (let i = 0; i < prices.length; i += groupSize) {
      const slice = prices.slice(i, i + groupSize);
      if (slice.length === 0) continue;
      candles.push({
        open: slice[0],
        close: slice[slice.length - 1],
        high: Math.max(...slice),
        low: Math.min(...slice),
      });
    }

    return candles;
  }

  private draw(): void {
    const { ctx, width, height, candles } = this;

    ctx.fillStyle = '#0c1821';
    ctx.fillRect(0, 0, width, height);

    if (candles.length === 0) return;

    const allValues = candles.flatMap((c) => [c.high, c.low]);
    const minPrice = Math.min(...allValues);
    const maxPrice = Math.max(...allValues);
    const range = maxPrice - minPrice || 1;

    const padding = 4;
    const chartH = height - padding * 2;
    const candleW = Math.max(2, Math.floor((width - padding * 2) / candles.length) - 1);
    const gap = 1;

    const toY = (price: number): number => {
      return padding + chartH - ((price - minPrice) / range) * chartH;
    };

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = padding + i * (candleW + gap);
      const bullish = c.close >= c.open;
      const color = bullish ? '#00e676' : '#ff1744';

      const wickX = x + Math.floor(candleW / 2);
      const wickTop = toY(c.high);
      const wickBottom = toY(c.low);

      ctx.fillStyle = color;
      ctx.fillRect(wickX, wickTop, 1, wickBottom - wickTop);

      const bodyTop = toY(Math.max(c.open, c.close));
      const bodyBottom = toY(Math.min(c.open, c.close));
      const bodyH = Math.max(1, bodyBottom - bodyTop);

      ctx.fillRect(x, bodyTop, candleW, bodyH);
    }
  }

  render(): void {
    this.container.appendChild(this.canvas);
    this.draw();
  }

  destroy(): void {
    this.canvas.remove();
  }
}
