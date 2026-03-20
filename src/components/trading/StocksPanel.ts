import { STOCK_ASSETS } from '../../constants/assets';
import { AssetRow } from './AssetRow';

function makeColumnHeaders(): HTMLElement {
  const hdr = document.createElement('div');
  hdr.className = 'asset-table-header';
  const cols = ['ASSET', 'PRICE', 'CHG', 'CHART', 'POS', 'ALLOC %', ''];
  for (const col of cols) {
    const lbl = document.createElement('span');
    lbl.className = 'asset-col-label';
    lbl.textContent = col;
    hdr.appendChild(lbl);
  }
  return hdr;
}

export class StocksPanel {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private rows: Map<string, AssetRow> = new Map();
  private onAllocationChange: (assetId: string, pct: number, position: 'long' | 'short') => void;

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
    }
  }

  render(): void {
    this.wrapper.innerHTML = '';
    this.rows.clear();

    const header = document.createElement('div');
    header.className = 'asset-panel__header';

    const icon = document.createElement('span');
    icon.className = 'asset-panel__icon';
    icon.textContent = '📈';

    const title = document.createElement('span');
    title.className = 'asset-panel__title';
    title.textContent = 'STOCKS';

    const count = document.createElement('span');
    count.style.fontFamily = "'VT323', monospace";
    count.style.fontSize = '18px';
    count.style.color = 'var(--muted-gray)';
    count.style.marginLeft = 'auto';
    count.textContent = `${STOCK_ASSETS.length} INSTRUMENTS`;

    header.appendChild(icon);
    header.appendChild(title);
    header.appendChild(count);
    this.wrapper.appendChild(header);

    this.wrapper.appendChild(makeColumnHeaders());

    for (const asset of STOCK_ASSETS) {
      const row = new AssetRow(this.wrapper, asset, this.onAllocationChange);
      row.render();
      this.rows.set(asset.id, row);
    }

    this.container.appendChild(this.wrapper);
  }

  destroy(): void {
    for (const row of this.rows.values()) {
      row.destroy();
    }
    this.rows.clear();
    this.wrapper.remove();
  }
}
