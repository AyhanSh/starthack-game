import type { AssetDef } from '../../types';
import { CandlestickChart } from '../charts/CandlestickChart';
import { PixelSlider } from '../ui/PixelSlider';

const CATEGORY_ICONS: Record<string, string> = {
  stocks: '📈',
  fx: '💱',
  crypto: '🪙',
};

export class AssetRow {
  private container: HTMLElement;
  private row: HTMLElement;
  private asset: AssetDef;
  private onAllocationChange: (assetId: string, pct: number, position: 'long' | 'short') => void;
  private currentPrice: number;
  private currentChange: number = 0;
  private position: 'long' | 'short' = 'long';
  private allocation: number = 0;
  private priceHistory: number[] = [];
  private priceEl: HTMLSpanElement | null = null;
  private changeEl: HTMLSpanElement | null = null;
  private candlestick: CandlestickChart | null = null;
  private slider: PixelSlider | null = null;
  private longBtn: HTMLButtonElement | null = null;
  private shortBtn: HTMLButtonElement | null = null;
  private sliderValueEl: HTMLSpanElement | null = null;

  constructor(
    container: HTMLElement,
    asset: AssetDef,
    onAllocationChange: (assetId: string, pct: number, position: 'long' | 'short') => void
  ) {
    this.container = container;
    this.asset = asset;
    this.currentPrice = asset.basePrice;
    this.priceHistory = [asset.basePrice];
    this.onAllocationChange = onAllocationChange;
    this.row = document.createElement('div');
    this.row.className = 'asset-row';
  }

  updatePrice(price: number, change: number): void {
    const prevPrice = this.currentPrice;
    this.currentPrice = price;
    this.currentChange = change;
    this.priceHistory.push(price);

    if (this.priceEl) {
      this.priceEl.textContent = this.formatPrice(price);
    }
    if (this.changeEl) {
      const pct = change * 100;
      this.changeEl.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
      this.changeEl.className = `asset-row__change ${pct >= 0 ? 'asset-row__change--up' : 'asset-row__change--down'}`;
    }
    if (this.candlestick && this.priceHistory.length > 2) {
      this.candlestick.update(this.priceHistory);
    }
    if (price !== prevPrice) {
      const cls = price > prevPrice ? 'asset-row--flash-up' : 'asset-row--flash-down';
      this.row.classList.add(cls);
      setTimeout(() => this.row.classList.remove(cls), 400);
    }
  }

  private formatPrice(price: number): string {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.001) return price.toFixed(4);
    return price.toFixed(6);
  }

  private updatePositionButtons(): void {
    if (this.longBtn && this.shortBtn) {
      const isLong = this.position === 'long';
      this.longBtn.className = `pos-btn ${isLong ? 'pos-btn--long-active' : ''}`;
      this.shortBtn.className = `pos-btn ${!isLong ? 'pos-btn--short-active' : ''}`;
    }
  }

  render(): void {
    this.row.innerHTML = '';

    // Name column
    const nameCol = document.createElement('div');
    nameCol.className = 'asset-row__name-col';
    const icon = document.createElement('span');
    icon.style.fontSize = '11px';
    icon.style.marginBottom = '1px';
    icon.style.display = 'block';
    icon.textContent = CATEGORY_ICONS[this.asset.category] ?? '📊';
    const nameEl = document.createElement('span');
    nameEl.className = 'asset-row__name';
    nameEl.textContent = this.asset.name;
    const tickerEl = document.createElement('span');
    tickerEl.className = 'asset-row__ticker';
    tickerEl.textContent = this.asset.ticker;
    nameCol.appendChild(icon);
    nameCol.appendChild(nameEl);
    nameCol.appendChild(tickerEl);

    // Price column
    const priceCol = document.createElement('div');
    priceCol.className = 'asset-row__price-col';
    this.priceEl = document.createElement('span');
    this.priceEl.className = 'asset-row__price';
    this.priceEl.textContent = this.formatPrice(this.currentPrice);
    priceCol.appendChild(this.priceEl);

    // Change column
    const pct = this.currentChange * 100;
    this.changeEl = document.createElement('div');
    this.changeEl.className = `asset-row__change ${pct >= 0 ? 'asset-row__change--up' : 'asset-row__change--down'}`;
    this.changeEl.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;

    // Candlestick chart
    const chartCol = document.createElement('div');
    chartCol.className = 'asset-row__chart';
    this.candlestick = new CandlestickChart(chartCol, 72, 32);
    this.candlestick.render();
    this.candlestick.update(this.priceHistory);

    // Long / Short buttons
    const posCol = document.createElement('div');
    posCol.className = 'asset-row__pos-btns';

    this.longBtn = document.createElement('button');
    this.longBtn.textContent = 'LONG ▲';
    this.longBtn.className = 'pos-btn pos-btn--long-active';

    this.shortBtn = document.createElement('button');
    this.shortBtn.textContent = 'SHORT ▼';
    this.shortBtn.className = 'pos-btn';

    this.updatePositionButtons();

    this.longBtn.addEventListener('click', () => {
      this.position = 'long';
      this.updatePositionButtons();
      this.onAllocationChange(this.asset.id, this.allocation, this.position);
    });
    this.shortBtn.addEventListener('click', () => {
      this.position = 'short';
      this.updatePositionButtons();
      this.onAllocationChange(this.asset.id, this.allocation, this.position);
    });

    posCol.appendChild(this.longBtn);
    posCol.appendChild(this.shortBtn);

    // Slider column
    const sliderCol = document.createElement('div');
    sliderCol.className = 'asset-row__slider-col';

    this.slider = new PixelSlider(sliderCol, '', 0, 100, this.allocation, (val) => {
      this.allocation = val;
      if (this.sliderValueEl) {
        this.sliderValueEl.textContent = `${val}%`;
        this.sliderValueEl.style.color = val > 0 ? 'var(--pixel-gold)' : 'var(--muted-gray)';
      }
      this.onAllocationChange(this.asset.id, val, this.position);
    });
    this.slider.render();

    this.sliderValueEl = document.createElement('span');
    this.sliderValueEl.className = 'slider-value';
    this.sliderValueEl.textContent = `${this.allocation}%`;
    this.sliderValueEl.style.color = 'var(--muted-gray)';
    sliderCol.appendChild(this.sliderValueEl);

    this.row.appendChild(nameCol);
    this.row.appendChild(priceCol);
    this.row.appendChild(this.changeEl);
    this.row.appendChild(chartCol);
    this.row.appendChild(posCol);
    this.row.appendChild(sliderCol);

    this.container.appendChild(this.row);
  }

  destroy(): void {
    if (this.candlestick) this.candlestick.destroy();
    if (this.slider) this.slider.destroy();
    this.row.remove();
  }
}
