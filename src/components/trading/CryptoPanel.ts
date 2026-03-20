import { CRYPTO_ASSETS } from '../../constants/assets';
import { AssetRow } from './AssetRow';
import { PixelButton } from '../ui/PixelButton';

function makeColumnHeaders(): HTMLElement {
  const hdr = document.createElement('div');
  hdr.className = 'asset-table-header';
  const cols = ['TOKEN', 'PRICE', 'CHG', 'CHART', 'POS', 'ALLOC %', ''];
  for (const col of cols) {
    const lbl = document.createElement('span');
    lbl.className = 'asset-col-label';
    lbl.textContent = col;
    hdr.appendChild(lbl);
  }
  return hdr;
}

export class CryptoPanel {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private rows: Map<string, AssetRow> = new Map();
  private onAllocationChange: (assetId: string, pct: number, position: 'long' | 'short') => void;
  private flashTimers: Map<string, number> = new Map();
  private yoloActive: boolean = false;
  private yoloButton: PixelButton | null = null;

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
        this.flashRow(assetId);
      }
    }
  }

  private flashRow(assetId: string): void {
    const existing = this.flashTimers.get(assetId);
    if (existing) clearTimeout(existing);

    const rowEl = this.wrapper.querySelector(`[data-crypto-id="${assetId}"]`) as HTMLElement | null;
    if (!rowEl) return;

    rowEl.style.background = 'rgba(191, 95, 255, 0.1)';
    rowEl.style.transition = 'background 0.35s';

    const timer = window.setTimeout(() => {
      rowEl.style.background = '';
      this.flashTimers.delete(assetId);
    }, 350);

    this.flashTimers.set(assetId, timer);
  }

  render(): void {
    this.wrapper.innerHTML = '';
    this.rows.clear();

    const header = document.createElement('div');
    header.className = 'asset-panel__header';

    const icon = document.createElement('span');
    icon.className = 'asset-panel__icon';
    icon.textContent = '🪙';

    const title = document.createElement('span');
    title.className = 'asset-panel__title asset-panel__title--crypto';
    title.textContent = 'CRYPTO';

    const volatilityBadge = document.createElement('span');
    volatilityBadge.style.fontFamily = "'Press Start 2P', monospace";
    volatilityBadge.style.fontSize = '6px';
    volatilityBadge.style.color = 'var(--terminal-bg)';
    volatilityBadge.style.background = 'var(--pixel-purple)';
    volatilityBadge.style.padding = '3px 6px';
    volatilityBadge.style.marginLeft = '8px';
    volatilityBadge.textContent = 'HIGH RISK';

    const count = document.createElement('span');
    count.style.fontFamily = "'VT323', monospace";
    count.style.fontSize = '18px';
    count.style.color = 'var(--muted-gray)';
    count.style.marginLeft = 'auto';
    count.textContent = `${CRYPTO_ASSETS.length} TOKENS`;

    header.appendChild(icon);
    header.appendChild(title);
    header.appendChild(volatilityBadge);
    header.appendChild(count);
    this.wrapper.appendChild(header);

    this.wrapper.appendChild(makeColumnHeaders());

    for (const asset of CRYPTO_ASSETS) {
      const rowContainer = document.createElement('div');
      rowContainer.dataset.cryptoId = asset.id;

      const row = new AssetRow(rowContainer, asset, this.onAllocationChange);
      row.render();
      this.rows.set(asset.id, row);

      if (asset.id === 'mooninu') {
        const yoloContainer = document.createElement('div');
        yoloContainer.style.padding = '6px 14px 8px 134px';
        yoloContainer.style.display = 'flex';
        yoloContainer.style.alignItems = 'center';
        yoloContainer.style.gap = '8px';

        this.yoloButton = new PixelButton(
          '🚀 YOLO ALL IN',
          () => {
            this.yoloActive = !this.yoloActive;
            if (this.yoloButton) {
              this.yoloButton.setText(this.yoloActive ? '🔥 YOLO ACTIVE!' : '🚀 YOLO ALL IN');
            }
            if (this.yoloActive) {
              yoloContainer.style.animation = 'yolo-shake 0.18s infinite';
            } else {
              yoloContainer.style.animation = 'none';
            }
          },
          'gold',
          false
        );

        const yoloHint = document.createElement('span');
        yoloHint.style.fontFamily = "'VT323', monospace";
        yoloHint.style.fontSize = '15px';
        yoloHint.style.color = 'var(--muted-gray)';
        yoloHint.textContent = 'to the moon? maybe...';

        yoloContainer.appendChild(this.yoloButton.getElement());
        yoloContainer.appendChild(yoloHint);
        rowContainer.appendChild(yoloContainer);

        if (!document.getElementById('yolo-shake-style')) {
          const shakeStyle = document.createElement('style');
          shakeStyle.id = 'yolo-shake-style';
          shakeStyle.textContent = `
            @keyframes yolo-shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-3px) rotate(-0.5deg); }
              75% { transform: translateX(3px) rotate(0.5deg); }
            }
          `;
          document.head.appendChild(shakeStyle);
        }
      }

      this.wrapper.appendChild(rowContainer);
    }

    this.container.appendChild(this.wrapper);
  }

  destroy(): void {
    for (const timer of this.flashTimers.values()) {
      clearTimeout(timer);
    }
    this.flashTimers.clear();
    for (const row of this.rows.values()) {
      row.destroy();
    }
    this.rows.clear();
    if (this.yoloButton) this.yoloButton.destroy();
    this.wrapper.remove();
  }
}
