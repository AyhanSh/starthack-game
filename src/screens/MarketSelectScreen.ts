import '../styles/market-select.css';
import { GameStore } from '../state/GameStore';
import { AudioEngine } from '../audio/AudioEngine';
import { SoundEffects } from '../audio/SoundEffects';
import { PixelButton } from '../components/ui/PixelButton';
import { MarketEngine } from '../engine/MarketEngine';
import { GameLoop } from '../engine/GameLoop';

interface BaseScreen {
  mount(container: HTMLElement): void;
  unmount(): void;
}

const MARKET_DEFS = [
  {
    id: 'stocks',
    name: 'STOCKS',
    icon: '📊',
    assets: 'SMI • SX5E • DJI • NESN • NVDA • UBSG',
    color: '#40c4ff',
    cssClass: 'market-tile--stocks',
    risk: 'Medium',
  },
  {
    id: 'fx',
    name: 'FOREX',
    icon: '💱',
    assets: 'USD/CHF • EUR/CHF • GBP/CHF • JPY/CHF',
    color: '#ffab40',
    cssClass: 'market-tile--fx',
    risk: 'Low',
  },
  {
    id: 'crypto',
    name: 'CRYPTO',
    icon: '🪙',
    assets: 'BTC • ETH • SOL • MOON',
    color: '#ce93d8',
    cssClass: 'market-tile--crypto',
    risk: 'High',
  },
] as const;

export class MarketSelectScreen implements BaseScreen {
  private store: GameStore;
  private sfx: SoundEffects;
  private container: HTMLElement | null = null;
  private selectedMarkets: Set<string> = new Set();

  constructor(store: GameStore, audio: AudioEngine) {
    this.store = store;
    this.sfx = new SoundEffects(audio);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';
    this.selectedMarkets.clear();

    const state = this.store.getState();

    const wrapper = document.createElement('div');
    wrapper.className = 'market-select scanlines';

    // Browser-like frame
    const browser = document.createElement('div');
    browser.className = 'market-browser';

    const chrome = document.createElement('div');
    chrome.className = 'market-browser__chrome';

    const dots = document.createElement('div');
    dots.className = 'market-browser__dots';
    chrome.appendChild(dots);

    const tabs = document.createElement('div');
    tabs.className = 'market-browser__tabs';
    const tab = document.createElement('div');
    tab.className = 'market-browser__tab market-browser__tab--active';
    tab.textContent = 'CHOOSE MARKETS';
    tabs.appendChild(tab);
    chrome.appendChild(tabs);

    const url = document.createElement('div');
    url.className = 'market-browser__url';
    url.textContent = 'https://terminal.local/choose-markets';
    chrome.appendChild(url);
    browser.appendChild(chrome);

    const browserBody = document.createElement('div');
    browserBody.className = 'market-browser__body';
    browser.appendChild(browserBody);
    wrapper.appendChild(browser);

    // Title
    const title = document.createElement('h1');
    title.className = 'market-select__title';
    title.textContent = 'CHOOSE YOUR MARKETS';
    browserBody.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'market-select__subtitle';
    subtitle.textContent = 'Select at least one market to trade in — you can pick multiple';
    browserBody.appendChild(subtitle);

    // Warning
    const warningEl = document.createElement('div');
    warningEl.className = 'market-select__warning';
    browserBody.appendChild(warningEl);

    // Market tiles
    const grid = document.createElement('div');
    grid.className = 'market-select__grid';
    browserBody.appendChild(grid);

    for (const market of MARKET_DEFS) {
      const tile = document.createElement('div');
      tile.className = `market-tile pixel-card ${market.cssClass}`;
      tile.id = `msMarket-${market.id}`;

      const iconEl = document.createElement('span');
      iconEl.className = 'market-tile__icon';
      iconEl.textContent = market.icon;
      tile.appendChild(iconEl);

      const nameEl = document.createElement('div');
      nameEl.className = 'market-tile__name';
      nameEl.textContent = market.name;
      tile.appendChild(nameEl);

      const assetsEl = document.createElement('div');
      assetsEl.className = 'market-tile__assets';
      assetsEl.textContent = market.assets;
      tile.appendChild(assetsEl);

      const riskEl = document.createElement('div');
      riskEl.style.cssText = `font-family: 'Press Start 2P', monospace; font-size: 8px; color: ${market.color}; margin-bottom: 12px;`;
      riskEl.textContent = `RISK: ${market.risk}`;
      tile.appendChild(riskEl);

      const checkbox = document.createElement('div');
      checkbox.className = 'market-tile__checkbox';
      tile.appendChild(checkbox);

      tile.addEventListener('click', () => {
        this.sfx.buttonPress();
        if (this.selectedMarkets.has(market.id)) {
          this.selectedMarkets.delete(market.id);
          tile.classList.remove('market-tile--active');
        } else {
          this.selectedMarkets.add(market.id);
          tile.classList.add('market-tile--active');
        }
        warningEl.textContent = '';
      });

      grid.appendChild(tile);
    }

    // Confirm button
    const confirmContainer = document.createElement('div');
    confirmContainer.className = 'market-select__confirm';
    confirmContainer.style.textAlign = 'center';

    const confirmBtn = new PixelButton('START SIMULATION →', async () => {
      if (this.selectedMarkets.size === 0) {
        warningEl.textContent = '⚠ Select at least one market!';
        return;
      }
      this.sfx.buttonPress();

      // Save selected categories
      this.store.dispatch({
        type: 'SELECT_CATEGORIES',
        categories: Array.from(this.selectedMarkets) as any,
      });

      // Kick off GameLoop if seed data is present
      const engines = (window as unknown as Record<string, unknown>).__gameEngines as
        { marketEngine: MarketEngine; gameLoop: GameLoop } | undefined;

      if (engines?.gameLoop && state.seedData) {
        await engines.gameLoop.startGame({
          playerId: state.playerId ?? 'offline',
          seed: state.seedData.seed,
          assets: state.seedData.assets,
          prices: state.seedData.prices,
          startingPortfolio: state.startingCash,
          monthlyContribution: state.monthlyContribution,
          // Start fully in cash so totalPortfolio stays correct until the user allocates
          allocations: [{ assetId: 'cash', pct: 100 }],
        });
      }

      // Legacy MarketEngine for chart/price-path compatibility
      if (engines?.marketEngine) {
        engines.marketEngine.generateAllPaths();
      }

      this.store.dispatch({ type: 'SET_SCREEN', screen: 'trading' });
    }, 'gold', true);

    confirmContainer.appendChild(confirmBtn.getElement());
    browserBody.appendChild(confirmContainer);

    container.appendChild(wrapper);
  }

  unmount(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
