import { FX_ASSETS } from '../../constants/assets';
import { AssetRow } from './AssetRow';

function makeColumnHeaders(): HTMLElement {
  const hdr = document.createElement('div');
  hdr.className = 'asset-table-header';
  const cols = ['PAIR', 'RATE', 'CHG', 'CHART', 'POS', 'ALLOC %', ''];
  for (const col of cols) {
    const lbl = document.createElement('span');
    lbl.className = 'asset-col-label';
    lbl.textContent = col;
    hdr.appendChild(lbl);
  }
  return hdr;
}

export class FXPanel {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private rows: Map<string, AssetRow> = new Map();
  private onAllocationChange: (assetId: string, pct: number, position: 'long' | 'short') => void;
  private pipArrows: Map<string, HTMLSpanElement> = new Map();

  constructor(
    container: HTMLElement,
    onAllocationChange: (assetId: string, pct: number, position: 'long' | 'short') => void
  ) {
    this.container = container;
    this.onAllocationChange = onAllocationChange;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'asset-panel';
  }

  updatePrices(prices: Record<string, { price: number; change: number }>): void {
    for (const [assetId, data] of Object.entries(prices)) {
      const row = this.rows.get(assetId);
      if (row) {
        row.updatePrice(data.price, data.change);
      }

      const arrow = this.pipArrows.get(assetId);
      if (arrow) {
        const pips = Math.round(data.change * 10000);
        if (pips > 0) {
          arrow.textContent = `▲ +${pips} pips`;
          arrow.style.color = 'var(--pixel-green)';
        } else if (pips < 0) {
          arrow.textContent = `▼ ${pips} pips`;
          arrow.style.color = 'var(--pixel-red)';
        } else {
          arrow.textContent = '— 0 pips';
          arrow.style.color = 'var(--muted-gray)';
        }
        arrow.style.transform = 'scale(1.2)';
        arrow.style.transition = 'transform 0.15s';
        setTimeout(() => { arrow.style.transform = 'scale(1)'; }, 150);
      }
    }
  }

  render(): void {
    this.wrapper.innerHTML = '';
    this.rows.clear();
    this.pipArrows.clear();

    const header = document.createElement('div');
    header.className = 'asset-panel__header';

    const icon = document.createElement('span');
    icon.className = 'asset-panel__icon';
    icon.textContent = '💱';

    const title = document.createElement('span');
    title.className = 'asset-panel__title asset-panel__title--fx';
    title.textContent = 'FOREX';

    const count = document.createElement('span');
    count.style.fontFamily = "'VT323', monospace";
    count.style.fontSize = '18px';
    count.style.color = 'var(--muted-gray)';
    count.style.marginLeft = 'auto';
    count.textContent = `${FX_ASSETS.length} PAIRS`;

    header.appendChild(icon);
    header.appendChild(title);
    header.appendChild(count);
    this.wrapper.appendChild(header);

    this.wrapper.appendChild(makeColumnHeaders());

    for (const asset of FX_ASSETS) {
      const rowContainer = document.createElement('div');

      const row = new AssetRow(rowContainer, asset, this.onAllocationChange);
      row.render();
      this.rows.set(asset.id, row);

      const pipIndicator = document.createElement('div');
      pipIndicator.style.padding = '1px 14px 3px 134px';

      const arrowSpan = document.createElement('span');
      arrowSpan.textContent = '— 0 pips';
      arrowSpan.style.fontFamily = "'VT323', monospace";
      arrowSpan.style.fontSize = '14px';
      arrowSpan.style.color = 'var(--muted-gray)';
      arrowSpan.style.display = 'inline-block';

      pipIndicator.appendChild(arrowSpan);
      this.pipArrows.set(asset.id, arrowSpan);

      rowContainer.appendChild(pipIndicator);
      this.wrapper.appendChild(rowContainer);
    }

    this.container.appendChild(this.wrapper);
  }

  destroy(): void {
    for (const row of this.rows.values()) {
      row.destroy();
    }
    this.rows.clear();
    this.pipArrows.clear();
    this.wrapper.remove();
  }
}
