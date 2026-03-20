import '../styles/character-select.css';
import type { CharacterID, Seed } from '../types';
import { GameStore } from '../state/GameStore';
import { AudioEngine } from '../audio/AudioEngine';
import { SoundEffects } from '../audio/SoundEffects';
import { CHARACTERS } from '../constants/characters';
import { PixelButton } from '../components/ui/PixelButton';
import * as SeedService from '../api/SeedService';
import * as PlayerService from '../api/PlayerService';
import { OFFLINE_SEED } from '../engine/offline-seed';

interface BaseScreen {
  mount(container: HTMLElement): void;
  unmount(): void;
}

const CHARACTER_VIDEO_URLS: Record<CharacterID, string> = {
  analyst: new URL('../animations/characters/avatars/1character.mp4', import.meta.url).href,
  hustler:  new URL('../animations/characters/avatars/2character.mp4', import.meta.url).href,
  retiree:  new URL('../animations/characters/avatars/3character.mp4', import.meta.url).href,
  student:  new URL('../animations/characters/avatars/4character.mp4', import.meta.url).href,
};

const CAPITAL_PRESETS = [
  { label: 'CHF 5K', value: 5000 },
  { label: 'CHF 10K', value: 10000 },
  { label: 'CHF 25K', value: 25000 },
  { label: 'CHF 100K', value: 100000 },
];

export class CharacterSelectScreen implements BaseScreen {
  private store: GameStore;
  private sfx: SoundEffects;
  private container: HTMLElement | null = null;
  private selectedId: CharacterID | null = null;
  private characterVideos: HTMLVideoElement[] = [];
  private unsubscribes: Array<() => void> = [];
  private seeds: Seed[] = [OFFLINE_SEED];
  private selectedSeedId: string = OFFLINE_SEED.id;
  private wrapper: HTMLElement | null = null;
  private selectedCapital: number = 10000;
  private monthlyContribution: number = 200;
  private nickname: string = '';

  constructor(store: GameStore, audio: AudioEngine) {
    this.store = store;
    this.sfx = new SoundEffects(audio);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'character-select';

    const title = document.createElement('h1');
    title.className = 'character-select__title';
    title.textContent = 'WEALTH MANAGER ARENA';
    wrapper.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'character-select__subtitle';
    subtitle.textContent = 'Choose your investor character';
    wrapper.appendChild(subtitle);

    const grid = document.createElement('div');
    grid.className = 'character-select__grid';

    for (const char of CHARACTERS) {
      const card = document.createElement('div');
      card.className = 'character-card pixel-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Select ${char.name}`);
      card.style.borderColor = char.accentColor + '40';

      const videoWrap = document.createElement('div');
      videoWrap.className = 'character-card__video-wrap';

      const video = document.createElement('video');
      video.src = CHARACTER_VIDEO_URLS[char.id];
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.className = 'character-card__video';
      void video.play().catch(() => {});
      this.characterVideos.push(video);

      videoWrap.appendChild(video);
      card.appendChild(videoWrap);

      const name = document.createElement('div');
      name.className = 'character-card__name';
      name.style.color = char.accentColor;
      name.textContent = char.name;
      card.appendChild(name);

      const roleEl = document.createElement('div');
      roleEl.className = 'character-card__role';
      roleEl.textContent = char.flavourQuote.split(' ').slice(0, 4).join(' ') + '...';
      card.appendChild(roleEl);

      const quote = document.createElement('div');
      quote.className = 'character-card__quote';
      quote.textContent = `"${char.flavourQuote}"`;
      card.appendChild(quote);

      card.addEventListener('click', () => {
        this.sfx.buttonPress();
        this.selectedId = char.id;
        grid.querySelectorAll('.character-card').forEach((c) => {
          (c as HTMLElement).classList.remove('pixel-card--selected');
          (c as HTMLElement).classList.remove('character-card--selected');
          (c as HTMLElement).style.boxShadow = '';
        });
        card.classList.add('pixel-card--selected');
        card.classList.add('character-card--selected');
        card.style.borderColor = char.accentColor;
        card.style.boxShadow = `5px 5px 0 ${char.accentColor}aa, 0 0 28px ${char.accentColor}30`;
        this.showOnboardingPanel(wrapper);
      });

      card.addEventListener('mouseenter', () => {
        if (!card.classList.contains('pixel-card--selected')) {
          card.style.borderColor = char.accentColor + '80';
        }
      });
      card.addEventListener('mouseleave', () => {
        if (!card.classList.contains('pixel-card--selected')) {
          card.style.borderColor = char.accentColor + '40';
        }
      });

      grid.appendChild(card);
    }

    wrapper.appendChild(grid);

    const skyline = document.createElement('div');
    skyline.className = 'character-select__skyline';
    wrapper.appendChild(skyline);

    this.wrapper = wrapper;
    container.appendChild(wrapper);

    // Seeds start as offline fallback; replace with real ones when loaded
    SeedService.fetchSeeds().then((seeds) => {
      if (seeds.length > 0) {
        this.seeds = seeds;
        // Keep current selection if it still exists, otherwise pick first
        if (!seeds.find(s => s.id === this.selectedSeedId)) {
          this.selectedSeedId = seeds[0].id;
        }
        // Re-render the onboarding panel if it's already open
        if (this.selectedId && this.wrapper) {
          this.showOnboardingPanel(this.wrapper);
        }
      }
    });
  }

  private showOnboardingPanel(wrapper: HTMLElement): void {
    let panel = wrapper.querySelector('.onboarding-panel') as HTMLElement | null;
    if (panel) {
      panel.remove();
    }

    panel = document.createElement('div');
    panel.className = 'onboarding-panel pixel-card';
    panel.style.cssText = `
      margin: 24px auto 0; padding: 20px;
      border: 2px solid #40c4ff; background: rgba(7,9,15,0.97);
      display: flex; flex-direction: column; gap: 16px;
    `;

    // Title
    const panelTitle = document.createElement('h2');
    panelTitle.style.cssText = `
      font-family: 'Press Start 2P', monospace; font-size: 14px;
      color: #40c4ff; text-align: center; margin: 0;
    `;
    panelTitle.textContent = '⚙ SETUP YOUR GAME';
    panel.appendChild(panelTitle);

    // Nickname
    const nickRow = this.createRow('NICKNAME');
    const nickInput = document.createElement('input');
    nickInput.type = 'text';
    nickInput.placeholder = 'Enter your name...';
    nickInput.value = this.nickname;
    nickInput.maxLength = 20;
    nickInput.style.cssText = `
      width: 100%; padding: 8px 12px; background: #0a0e1a; border: 2px solid #1e3a5f;
      color: #e8f4f8; font-family: 'VT323', monospace; font-size: 18px;
      outline: none; image-rendering: pixelated;
    `;
    nickInput.addEventListener('input', () => {
      this.nickname = nickInput.value;
    });
    nickRow.appendChild(nickInput);
    panel.appendChild(nickRow);

    // Seed / Scenario selection
    const seedRow = this.createRow('SCENARIO');
    if (this.seeds.length > 0) {
      const seedSelect = document.createElement('div');
      seedSelect.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

      for (const seed of this.seeds) {
        const seedBtn = document.createElement('button');
        const diffColors: Record<string, string> = {
          easy: '#00e676', medium: '#ffab40', hard: '#ff1744',
        };
        const color = diffColors[seed.difficulty] ?? '#40c4ff';
        const isSelected = seed.id === this.selectedSeedId;
        seedBtn.style.cssText = `
          padding: 8px 16px; border: 2px solid ${isSelected ? color : '#1e3a5f'};
          background: ${isSelected ? color + '30' : '#0a0e1a'};
          color: ${color}; font-family: 'Press Start 2P', monospace; font-size: 10px;
          cursor: pointer; transition: all 0.15s;
        `;
        seedBtn.textContent = `${seed.name} [${seed.difficulty.toUpperCase()}]`;
        seedBtn.addEventListener('click', () => {
          this.sfx.buttonPress();
          this.selectedSeedId = seed.id;
          this.showOnboardingPanel(wrapper);
        });
        seedSelect.appendChild(seedBtn);
      }
      seedRow.appendChild(seedSelect);
    } else {
      const noSeeds = document.createElement('span');
      noSeeds.style.cssText = 'color: #666; font-family: VT323, monospace; font-size: 16px;';
      noSeeds.textContent = 'Loading scenarios... (or offline mode)';
      seedRow.appendChild(noSeeds);
    }
    panel.appendChild(seedRow);

    // Starting Capital
    const capRow = this.createRow('STARTING CAPITAL');
    const capBtns = document.createElement('div');
    capBtns.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';
    for (const preset of CAPITAL_PRESETS) {
      const btn = document.createElement('button');
      const isSelected = this.selectedCapital === preset.value;
      btn.style.cssText = `
        padding: 8px 14px; border: 2px solid ${isSelected ? '#ffab40' : '#1e3a5f'};
        background: ${isSelected ? '#ffab4030' : '#0a0e1a'};
        color: ${isSelected ? '#ffab40' : '#8899aa'}; font-family: 'Press Start 2P', monospace;
        font-size: 10px; cursor: pointer; transition: all 0.15s;
      `;
      btn.textContent = preset.label;
      btn.addEventListener('click', () => {
        this.sfx.buttonPress();
        this.selectedCapital = preset.value;
        this.showOnboardingPanel(wrapper);
      });
      capBtns.appendChild(btn);
    }
    capRow.appendChild(capBtns);
    panel.appendChild(capRow);

    // Monthly contribution slider
    const contribRow = this.createRow(`MONTHLY: CHF ${this.monthlyContribution}`);
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1000';
    slider.step = '50';
    slider.value = String(this.monthlyContribution);
    slider.style.cssText = 'width: 100%; accent-color: #ce93d8;';
    slider.addEventListener('input', () => {
      this.monthlyContribution = Number(slider.value);
      const lbl = contribRow.querySelector('.onboarding-label') as HTMLElement;
      if (lbl) lbl.textContent = `MONTHLY: CHF ${this.monthlyContribution}`;
    });
    contribRow.appendChild(slider);
    panel.appendChild(contribRow);

    // Confirm button
    const confirmContainer = document.createElement('div');
    confirmContainer.style.cssText = 'text-align: center; margin-top: 8px;';
    const confirmBtn = new PixelButton('START GAME →', async () => {
      if (!this.selectedId) return;
      this.sfx.buttonPress();

      // Save to store
      this.store.dispatch({ type: 'SELECT_CHARACTER', characterId: this.selectedId });
      this.store.setState({
        nickname: this.nickname || 'Player',
        startingCash: this.selectedCapital,
        startingPortfolio: this.selectedCapital,
        currentCash: this.selectedCapital,
        portfolioValue: this.selectedCapital,
        monthlyContribution: this.monthlyContribution,
      });

      // Create player in Supabase (fire-and-forget)
      const charDef = CHARACTERS.find(c => c.id === this.selectedId);
      PlayerService.createPlayer(
        this.nickname || 'Player',
        charDef?.name ?? '🎮',
      ).then(player => {
        if (player) {
          this.store.setState({ playerId: player.id });
        }
      });

      // Fetch seed data
      const seedData = await SeedService.fetchSeedData(this.selectedSeedId);
      if (seedData) {
        this.store.setState({ seedData });
      }

      // Navigate to market select
      this.store.dispatch({ type: 'SET_SCREEN', screen: 'market-select' });
    }, 'gold', true);
    confirmContainer.appendChild(confirmBtn.getElement());
    panel.appendChild(confirmContainer);

    wrapper.appendChild(panel);

    // Scroll to panel
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private createRow(label: string): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
    const lbl = document.createElement('span');
    lbl.className = 'onboarding-label';
    lbl.style.cssText = `
      font-family: 'Press Start 2P', monospace; font-size: 10px;
      color: #8899aa; text-transform: uppercase;
    `;
    lbl.textContent = label;
    row.appendChild(lbl);
    return row;
  }

  unmount(): void {
    for (const v of this.characterVideos) {
      v.pause();
      v.removeAttribute('src');
      v.load();
    }
    this.characterVideos = [];
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
    this.wrapper = null;
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
