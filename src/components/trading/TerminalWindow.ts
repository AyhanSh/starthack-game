import { PixelTabs } from '../ui/PixelTabs';
import { NewsTicker } from '../ui/NewsTicker';
import { StocksPanel } from './StocksPanel';
import { FXPanel } from './FXPanel';
import { CryptoPanel } from './CryptoPanel';
import { PortfolioSummary } from './PortfolioSummary';
import { ChartsPanel } from './ChartsPanel';
import { PixelButton } from '../ui/PixelButton';
import { PortfolioLineChart } from '../charts/PortfolioLineChart';
import { GameLoop } from '../../engine/GameLoop';
import type { MarketCategory } from '../../types';

let nextZIndex = 40;

export interface TerminalWindowConfig {
  id: number;
  title: string;
  categories: MarketCategory[];
  initialTab?: string;
  left: number;
  top: number;
  width?: string;
  onFocus: (id: number) => void;
  onClose: (id: number) => void;
  onAllocationChange: (assetId: string, pct: number, position: 'long' | 'short') => void;
  getGameLoop: () => GameLoop | undefined;
  sfx: {
    tabClick: () => void;
    buttonPress: () => void;
    timeskipWhoosh: () => void;
  };
  getStoreState: () => {
    currentMonth: number;
    pricePaths: Record<string, Array<{ price: number; change: number }>>;
    portfolioValue: number;
    currentCash: number;
    startingCash: number;
  };
}

export class TerminalWindow {
  readonly id: number;
  private config: TerminalWindowConfig;
  private el: HTMLElement;
  private dragCleanup: (() => void) | null = null;

  private tabs: PixelTabs | null = null;
  private stocksPanel: StocksPanel | null = null;
  private fxPanel: FXPanel | null = null;
  private cryptoPanel: CryptoPanel | null = null;
  private portfolioSummary: PortfolioSummary | null = null;
  private newsTicker: NewsTicker | null = null;
  private portfolioChart: PortfolioLineChart | null = null;
  private chartsPanel: ChartsPanel | null = null;
  private panelContainer: HTMLElement | null = null;
  private activeTab: string = '';
  private simStatusEl: HTMLElement | null = null;
  private progressBarFill: HTMLElement | null = null;
  private minimized = false;
  private screenEl: HTMLElement | null = null;
  private footerEl: HTMLElement | null = null;

  constructor(config: TerminalWindowConfig) {
    this.id = config.id;
    this.config = config;
    this.el = document.createElement('div');
    this.el.className = 'terminal-window';
    this.el.dataset.termId = String(config.id);
    this.el.style.left = `${config.left}px`;
    this.el.style.top = `${config.top}px`;
    if (config.width) {
      this.el.style.width = config.width;
    }
    this.el.style.zIndex = String(nextZIndex++);

    this.el.addEventListener('pointerdown', () => {
      this.bringToFront();
      this.config.onFocus(this.id);
    }, true);

    this.build();
  }

  getElement(): HTMLElement {
    return this.el;
  }

  bringToFront(): void {
    this.el.style.zIndex = String(nextZIndex++);
  }

  private build(): void {
    const monitor = document.createElement('div');
    monitor.className = 'terminal-monitor';

    const bezel = document.createElement('div');
    bezel.className = 'terminal-bezel';

    const screen = document.createElement('div');
    screen.className = 'terminal-screen';
    this.screenEl = screen;

    const header = this.buildHeader();
    screen.appendChild(header);

    this.dragCleanup = this.makeDraggable(this.el, header);

    const tabDefs: Array<{ id: string; label: string }> = [];
    if (this.config.categories.includes('stocks')) tabDefs.push({ id: 'stocks', label: 'STOCKS' });
    if (this.config.categories.includes('fx')) tabDefs.push({ id: 'fx', label: 'FOREX' });
    if (this.config.categories.includes('crypto')) tabDefs.push({ id: 'crypto', label: 'CRYPTO' });
    tabDefs.push({ id: 'charts', label: 'CHARTS' });
    tabDefs.push({ id: 'portfolio', label: 'PORTFOLIO' });

    this.activeTab = this.config.initialTab ?? tabDefs[0]?.id ?? 'stocks';

    const tabContainer = document.createElement('div');
    this.tabs = new PixelTabs(tabContainer, tabDefs, (id) => {
      this.config.sfx.tabClick();
      this.activeTab = id;
      this.showPanel(id);
    });
    if (this.config.initialTab) {
      this.tabs.setActive(this.config.initialTab);
    }
    this.tabs.render();
    screen.appendChild(tabContainer);

    this.panelContainer = document.createElement('div');
    this.panelContainer.className = 'terminal-panel-area';
    this.panelContainer.style.flex = '1';
    this.panelContainer.style.overflow = 'auto';
    screen.appendChild(this.panelContainer);

    this.buildPanels();
    this.showPanel(this.activeTab);

    const summaryContainer = document.createElement('div');
    this.portfolioSummary = new PortfolioSummary(summaryContainer);
    this.portfolioSummary.render();
    screen.appendChild(summaryContainer);

    const tickerContainer = document.createElement('div');
    this.newsTicker = new NewsTicker(tickerContainer);
    this.newsTicker.render();
    screen.appendChild(tickerContainer);

    const footer = this.buildFooter();
    this.footerEl = footer;
    screen.appendChild(footer);

    bezel.appendChild(screen);
    monitor.appendChild(bezel);
    this.el.appendChild(monitor);
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'terminal-header';

    const titleGroup = document.createElement('div');
    titleGroup.style.display = 'flex';
    titleGroup.style.alignItems = 'center';
    titleGroup.style.gap = '8px';
    titleGroup.style.flex = '1';
    titleGroup.style.minWidth = '0';

    const title = document.createElement('span');
    title.className = 'terminal-header__title';
    title.textContent = `▶ ${this.config.title}`;
    titleGroup.appendChild(title);

    header.appendChild(titleGroup);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'terminal-window__btns';

    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'terminal-window__ctrl-btn terminal-window__ctrl-btn--minimize';
    minimizeBtn.title = 'Minimize';
    minimizeBtn.innerHTML = '<span class="terminal-window__ctrl-icon">—</span>';
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });
    btnGroup.appendChild(minimizeBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'terminal-window__ctrl-btn terminal-window__ctrl-btn--close';
    closeBtn.title = 'Close';
    closeBtn.innerHTML = '<span class="terminal-window__ctrl-icon">✕</span>';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.animateClose();
    });
    btnGroup.appendChild(closeBtn);

    header.appendChild(btnGroup);

    return header;
  }

  private animateClose(): void {
    this.el.classList.add('terminal-window--closing');
    this.el.addEventListener('animationend', () => {
      this.config.onClose(this.id);
    }, { once: true });
  }

  private toggleMinimize(): void {
    this.minimized = !this.minimized;
    if (this.minimized) {
      this.el.classList.add('terminal-window--minimized');
    } else {
      this.el.classList.remove('terminal-window--minimized');
    }
  }

  private buildFooter(): HTMLElement {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'trading-screen__invest-btn';
    buttonContainer.style.cssText = 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap;';

    this.simStatusEl = document.createElement('div');
    this.simStatusEl.style.cssText = `
      font-family: 'Press Start 2P', monospace; font-size: 10px; color: #8899aa;
      flex: 1; min-width: 200px;
    `;
    this.simStatusEl.textContent = 'Ready to simulate';
    buttonContainer.appendChild(this.simStatusEl);

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      width: 100%; height: 6px; background: #1e3a5f; border-radius: 3px;
      margin-top: 4px; overflow: hidden;
    `;
    this.progressBarFill = document.createElement('div');
    this.progressBarFill.style.cssText = `
      width: 0%; height: 100%; background: linear-gradient(90deg, #40c4ff, #00e676);
      transition: width 0.3s ease;
    `;
    progressBar.appendChild(this.progressBarFill);
    buttonContainer.appendChild(progressBar);

    const playBtn = new PixelButton('▶ PLAY', () => {
      this.config.sfx.buttonPress();
      const gl = this.config.getGameLoop();
      if (gl) {
        const phase = gl.getPhase();
        if (phase === 'paused' || phase === 'idle') gl.play();
        else if (phase === 'simulating') gl.pause();
      }
    }, 'blue', false);
    buttonContainer.appendChild(playBtn.getElement());

    for (const speed of [1, 3, 5] as const) {
      const label = speed === 1 ? '1×' : speed === 3 ? '3×' : '5×';
      const speedBtn = new PixelButton(label, () => {
        this.config.sfx.tabClick();
        this.config.getGameLoop()?.setSpeed(speed);
      }, 'default', false);
      buttonContainer.appendChild(speedBtn.getElement());
    }

    const skipYearBtn = new PixelButton('⏩ SKIP YEAR', () => {
      this.config.sfx.timeskipWhoosh();
      this.config.getGameLoop()?.skipYear();
    }, 'gold', false);
    buttonContainer.appendChild(skipYearBtn.getElement());

    return buttonContainer;
  }

  private buildPanels(): void {
    const handleAllocChange = this.config.onAllocationChange;

    if (this.config.categories.includes('stocks')) {
      const c = document.createElement('div');
      c.dataset.panel = 'stocks';
      c.style.display = 'none';
      this.stocksPanel = new StocksPanel(c, handleAllocChange);
      this.stocksPanel.render();
      this.panelContainer?.appendChild(c);
    }

    if (this.config.categories.includes('fx')) {
      const c = document.createElement('div');
      c.dataset.panel = 'fx';
      c.style.display = 'none';
      this.fxPanel = new FXPanel(c, handleAllocChange);
      this.fxPanel.render();
      this.panelContainer?.appendChild(c);
    }

    if (this.config.categories.includes('crypto')) {
      const c = document.createElement('div');
      c.dataset.panel = 'crypto';
      c.style.display = 'none';
      this.cryptoPanel = new CryptoPanel(c, handleAllocChange);
      this.cryptoPanel.render();
      this.panelContainer?.appendChild(c);
    }

    const chartsC = document.createElement('div');
    chartsC.dataset.panel = 'charts';
    chartsC.style.display = 'none';
    chartsC.style.height = '100%';
    this.chartsPanel = new ChartsPanel(chartsC);
    this.chartsPanel.render();
    this.panelContainer?.appendChild(chartsC);

    const portfolioC = document.createElement('div');
    portfolioC.dataset.panel = 'portfolio';
    portfolioC.style.display = 'none';
    this.portfolioChart = new PortfolioLineChart(portfolioC);
    this.portfolioChart.render();
    this.panelContainer?.appendChild(portfolioC);
  }

  private showPanel(id: string): void {
    if (!this.panelContainer) return;
    const panels = this.panelContainer.querySelectorAll('[data-panel]');
    panels.forEach((p) => { (p as HTMLElement).style.display = 'none'; });
    const target = this.panelContainer.querySelector(`[data-panel="${id}"]`) as HTMLElement | null;
    if (target) target.style.display = 'block';
  }

  onTick(gameLoop: GameLoop): void {
    const simState = gameLoop.getState();

    if (this.simStatusEl) {
      const year = gameLoop.getCurrentYear();
      const week = gameLoop.getCurrentWeekInYear();
      const speed = gameLoop.getSpeed();
      const portfolio = simState?.totalPortfolio ?? 0;
      this.simStatusEl.textContent = `Year ${year} • Week ${week} • ${speed}× • CHF ${Math.round(portfolio).toLocaleString()}`;
    }

    if (this.progressBarFill) {
      this.progressBarFill.style.width = `${gameLoop.getProgressPct()}%`;
    }

    this.updatePortfolioChart(gameLoop);
    this.updateChartsPanel(gameLoop);
    this.updatePortfolioSummary(gameLoop);
    this.updatePanelPrices();
  }

  private updatePanelPrices(): void {
    const st = this.config.getStoreState();
    const month = st.currentMonth;
    const pricePaths = st.pricePaths;
    const prices: Record<string, { price: number; change: number }> = {};
    for (const [assetId, path] of Object.entries(pricePaths)) {
      if (month < path.length) {
        prices[assetId] = { price: path[month].price, change: path[month].change };
      }
    }
    this.stocksPanel?.updatePrices(prices);
    this.fxPanel?.updatePrices(prices);
    this.cryptoPanel?.updatePrices(prices);
  }

  private updatePortfolioChart(gameLoop: GameLoop): void {
    if (!this.portfolioChart) return;
    const st = this.config.getStoreState();

    if (gameLoop.portfolioHistory.length > 0) {
      const portfolioData = [...gameLoop.portfolioHistory];
      const benchmarkData = gameLoop.benchmarkHistory.length > 0
        ? [...gameLoop.benchmarkHistory]
        : portfolioData.map(() => st.startingCash);

      const len = portfolioData.length;
      const step = Math.max(1, Math.floor(len / 60));
      const sp: number[] = [];
      const sb: number[] = [];
      const sl: string[] = [];

      for (let i = 0; i < len; i += step) {
        sp.push(portfolioData[i]);
        sb.push(benchmarkData[Math.min(i, benchmarkData.length - 1)]);
        const year = Math.floor(i / 52) + 1;
        const week = (i % 52) + 1;
        sl.push(`Y${year}W${week}`);
      }
      if ((len - 1) % step !== 0) {
        sp.push(portfolioData[len - 1]);
        sb.push(benchmarkData[Math.min(len - 1, benchmarkData.length - 1)]);
        const y = Math.floor((len - 1) / 52) + 1;
        const w = ((len - 1) % 52) + 1;
        sl.push(`Y${y}W${w}`);
      }

      this.portfolioChart.update(sp, sb, sl);
    } else {
      this.portfolioChart.update([st.startingCash], [st.startingCash], ['Start']);
    }
  }

  private updateChartsPanel(gameLoop: GameLoop): void {
    if (!this.chartsPanel) return;
    const simState = gameLoop.getState();
    const portfolioHistory = gameLoop.portfolioHistory ?? [];
    const benchmarkHistory = gameLoop.benchmarkHistory ?? [];

    const positionBreakdown: Array<{ label: string; value: number; color: string }> = [];
    if (simState && simState.positions.length > 0) {
      const total = simState.totalPortfolio;
      for (const pos of simState.positions) {
        if (pos.value <= 0) continue;
        const pct = total > 0 ? (pos.value / total) * 100 : 0;
        let label = pos.assetId.toUpperCase();
        let color = '#40c4ff';
        if (pos.assetId === 'cash') { color = '#546e7a'; label = 'CASH'; }
        else if (['btc', 'eth', 'sol', 'mooninu'].includes(pos.assetId)) color = '#ce93d8';
        else if (pos.assetId.includes('bond')) color = '#00e676';
        else if (pos.assetId.includes('gold')) color = '#ffd700';
        else if (pos.assetId.includes('chf') || pos.assetId.includes('eur')) color = '#ffb74d';
        positionBreakdown.push({ label, value: pct, color });
      }
    }

    this.chartsPanel.update({
      portfolioHistory,
      benchmarkHistory,
      positionBreakdown,
      weeklyReturns: [],
      projection: gameLoop.projection,
    });
  }

  private updatePortfolioSummary(gameLoop: GameLoop): void {
    if (!this.portfolioSummary) return;
    const st = this.config.getStoreState();
    const simState = gameLoop.getState();

    const portfolioValue = simState?.totalPortfolio ?? st.portfolioValue;
    const cashValue = simState?.cashValue ?? st.currentCash;
    const startingCash = st.startingCash;

    const categoryPcts: Record<string, number> = {};
    if (simState && simState.positions.length > 0) {
      const total = simState.totalPortfolio;
      for (const pos of simState.positions) {
        if (pos.value <= 0) continue;
        let cat = 'stocks';
        if (pos.assetId === 'cash') cat = 'cash';
        else if (pos.assetId.includes('chf') || pos.assetId.includes('bond') || pos.assetId.includes('gold')) cat = 'fx';
        else if (['btc', 'eth', 'sol', 'mooninu'].includes(pos.assetId)) cat = 'crypto';
        const pct = total > 0 ? (pos.value / total) * 100 : 0;
        categoryPcts[cat] = (categoryPcts[cat] ?? 0) + pct;
      }
    }

    const allocArray = Object.entries(categoryPcts).map(([category, pct]) => ({ category, pct }));
    const returnPct = startingCash > 0 ? ((portfolioValue - startingCash) / startingCash) * 100 : 0;
    this.portfolioSummary.update(portfolioValue, returnPct, cashValue, allocArray);
  }

  private makeDraggable(host: HTMLElement, handle: HTMLElement): () => void {
    let dragging = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;
    let ptrId: number | null = null;

    const getPx = (v: string | null): number => {
      if (!v) return 0;
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

    const onDown = (e: PointerEvent): void => {
      if (e.button !== 0) return;
      dragging = true;
      ptrId = e.pointerId;
      handle.setPointerCapture(ptrId);
      const cs = window.getComputedStyle(host);
      startLeft = getPx(cs.left);
      startTop = getPx(cs.top);
      startX = e.clientX;
      startY = e.clientY;
      host.style.left = `${startLeft}px`;
      host.style.top = `${startTop}px`;
      host.style.right = 'auto';
      host.classList.add('terminal--dragging');
      e.preventDefault();
    };

    const onMove = (e: PointerEvent): void => {
      if (!dragging || (ptrId != null && e.pointerId !== ptrId)) return;
      const rect = host.getBoundingClientRect();
      const maxL = window.innerWidth - rect.width - 8;
      const maxT = window.innerHeight - rect.height - 8;
      host.style.left = `${clamp(startLeft + e.clientX - startX, 8, Math.max(8, maxL))}px`;
      host.style.top = `${clamp(startTop + e.clientY - startY, 8, Math.max(8, maxT))}px`;
    };

    const endDrag = (): void => {
      if (!dragging) return;
      dragging = false;
      host.classList.remove('terminal--dragging');
      if (ptrId != null) { try { handle.releasePointerCapture(ptrId); } catch {} }
      ptrId = null;
    };

    const onUp = (e: PointerEvent): void => { if (ptrId == null || e.pointerId === ptrId) endDrag(); };

    handle.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      handle.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      endDrag();
    };
  }

  destroy(): void {
    this.dragCleanup?.();
    this.stocksPanel?.destroy();
    this.fxPanel?.destroy();
    this.cryptoPanel?.destroy();
    this.portfolioSummary?.destroy();
    this.newsTicker?.destroy();
    this.tabs?.destroy();
    this.chartsPanel?.destroy();
    this.portfolioChart?.destroy();
    this.el.remove();
  }
}
