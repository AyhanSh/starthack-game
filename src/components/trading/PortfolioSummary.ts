import { CATEGORY_COLORS } from '../../constants/ui';

const CATEGORY_LABELS: Record<string, string> = {
  stocks: 'STK',
  fx: 'FX',
  crypto: 'CRY',
  cash: 'CSH',
};

export class PortfolioSummary {
  private container: HTMLElement;
  private bar: HTMLElement;
  private totalEl: HTMLSpanElement | null = null;
  private returnEl: HTMLSpanElement | null = null;
  private cashEl: HTMLSpanElement | null = null;
  private allocBar: HTMLElement | null = null;
  private allocLegend: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.bar = document.createElement('div');
    this.bar.className = 'portfolio-summary';
  }

  update(
    totalValue: number,
    returnPct: number,
    cash: number,
    allocations: Array<{ category: string; pct: number }>
  ): void {
    if (this.totalEl) {
      this.totalEl.textContent = `CHF ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }

    if (this.returnEl) {
      const arrow = returnPct >= 0 ? '▲' : '▼';
      this.returnEl.textContent = `${arrow} ${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`;
      this.returnEl.className = `portfolio-summary__return ${returnPct >= 0 ? 'portfolio-summary__return--up' : 'portfolio-summary__return--down'}`;
    }

    if (this.cashEl) {
      this.cashEl.textContent = `CHF ${cash.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }

    if (this.allocBar) {
      this.allocBar.innerHTML = '';
      for (const alloc of allocations) {
        if (alloc.pct <= 0) continue;
        const segment = document.createElement('div');
        segment.className = `alloc-segment alloc-segment--${alloc.category}`;
        segment.style.flex = String(alloc.pct);
        segment.style.background = CATEGORY_COLORS[alloc.category] ?? '#546e7a';
        segment.title = `${alloc.category.toUpperCase()}: ${alloc.pct.toFixed(1)}%`;
        this.allocBar.appendChild(segment);
      }
    }

    if (this.allocLegend) {
      this.allocLegend.innerHTML = '';
      for (const alloc of allocations) {
        if (alloc.pct <= 1) continue;
        const chip = document.createElement('span');
        chip.style.display = 'inline-flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '3px';
        chip.style.marginRight = '6px';

        const dot = document.createElement('span');
        dot.style.width = '6px';
        dot.style.height = '6px';
        dot.style.background = CATEGORY_COLORS[alloc.category] ?? '#546e7a';
        dot.style.display = 'inline-block';
        dot.style.flexShrink = '0';

        const lbl = document.createElement('span');
        lbl.style.fontFamily = "'Press Start 2P', monospace";
        lbl.style.fontSize = '5px';
        lbl.style.color = '#7090a8';
        lbl.textContent = `${CATEGORY_LABELS[alloc.category] ?? alloc.category.toUpperCase()} ${alloc.pct.toFixed(0)}%`;

        chip.appendChild(dot);
        chip.appendChild(lbl);
        this.allocLegend.appendChild(chip);
      }
    }
  }

  render(): void {
    this.bar.innerHTML = '';

    // Left: total value
    const leftCol = document.createElement('div');
    leftCol.className = 'portfolio-summary__left';

    const valueLabel = document.createElement('span');
    valueLabel.className = 'portfolio-summary__label';
    valueLabel.textContent = 'PORTFOLIO VALUE';

    this.totalEl = document.createElement('span');
    this.totalEl.className = 'portfolio-summary__value';
    this.totalEl.textContent = 'CHF 100,000';

    leftCol.appendChild(valueLabel);
    leftCol.appendChild(this.totalEl);

    // Return badge
    this.returnEl = document.createElement('span');
    this.returnEl.className = 'portfolio-summary__return portfolio-summary__return--up';
    this.returnEl.textContent = '▲ +0.00%';

    // Middle: allocation bar + legend
    const allocWrapper = document.createElement('div');
    allocWrapper.className = 'portfolio-summary__alloc';

    const allocHeader = document.createElement('div');
    allocHeader.style.display = 'flex';
    allocHeader.style.justifyContent = 'space-between';
    allocHeader.style.alignItems = 'center';
    allocHeader.style.marginBottom = '3px';

    const allocLabel = document.createElement('span');
    allocLabel.className = 'portfolio-summary__alloc-label';
    allocLabel.textContent = 'ALLOCATION';

    this.allocLegend = document.createElement('span');
    this.allocLegend.style.display = 'flex';
    this.allocLegend.style.alignItems = 'center';
    this.allocLegend.style.flexWrap = 'wrap';

    allocHeader.appendChild(allocLabel);
    allocHeader.appendChild(this.allocLegend);

    this.allocBar = document.createElement('div');
    this.allocBar.className = 'portfolio-summary__alloc-bar';

    // Initial cash segment
    const cashSeg = document.createElement('div');
    cashSeg.className = 'alloc-segment alloc-segment--cash';
    cashSeg.style.flex = '100';
    this.allocBar.appendChild(cashSeg);

    allocWrapper.appendChild(allocHeader);
    allocWrapper.appendChild(this.allocBar);

    // Right: cash position
    const cashCol = document.createElement('div');
    cashCol.className = 'portfolio-summary__cash';

    const cashLabel = document.createElement('span');
    cashLabel.className = 'portfolio-summary__cash-label';
    cashLabel.textContent = 'CASH';

    this.cashEl = document.createElement('span');
    this.cashEl.className = 'portfolio-summary__cash-value';
    this.cashEl.textContent = 'CHF 100,000';

    cashCol.appendChild(cashLabel);
    cashCol.appendChild(this.cashEl);

    this.bar.appendChild(leftCol);
    this.bar.appendChild(this.returnEl);
    this.bar.appendChild(allocWrapper);
    this.bar.appendChild(cashCol);

    this.container.appendChild(this.bar);
  }

  destroy(): void {
    this.bar.remove();
  }
}
