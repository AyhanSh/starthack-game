import '../styles/multiplayer.css';
import '../styles/trading.css';
import { MultiplayerOrchestrator } from '../multiplayer/MultiplayerOrchestrator';
import { MultiplayerStore } from '../multiplayer/MultiplayerStore';
import { DuelResultsScreen } from './DuelResultsScreen';
import { GameStore } from '../state/GameStore';
import { AudioEngine } from '../audio/AudioEngine';
import { SoundEffects } from '../audio/SoundEffects';
import { PixelButton } from '../components/ui/PixelButton';
import { GameLoop } from '../engine/GameLoop';
import * as MatchService from '../multiplayer/MatchService';
import * as PlayerService from '../api/PlayerService';
import * as SeedService from '../api/SeedService';
import { CHARACTERS } from '../constants/characters';
import type { CharacterID } from '../types';
import type { DecisionSubmission, HiddenIntent, BluffAction, MultiplayerPhase } from '../types/multiplayer.types';
import { TerminalWindow } from '../components/trading/TerminalWindow';
import { NewsOverlay } from '../components/ui/NewsOverlay';

const LOBBY_VIDEO_URL = new URL(
  '../animations/loop_lobby.mp4', import.meta.url,
).href;

const ARENA_VIDEO_URL = new URL(
  '../animations/characters/1ch_loop.mp4', import.meta.url,
).href;

const MATCH_STARTED_VIDEO_URL = new URL(
  '../animations/characters/avatars/matchmaking.mp4', import.meta.url,
).href;

const MATCH_GOING_VIDEO_URL = new URL(
  '../animations/characters/avatars/matchgoing.mp4', import.meta.url,
).href;

const MULTIPLAYER_CHARACTER_VIDEOS: Record<CharacterID, string> = {
  analyst: new URL('../animations/characters/avatars/1character.mp4', import.meta.url).href,
  hustler:  new URL('../animations/characters/avatars/2character.mp4', import.meta.url).href,
  retiree:  new URL('../animations/characters/avatars/3character.mp4', import.meta.url).href,
  student:  new URL('../animations/characters/avatars/4character.mp4', import.meta.url).href,
};

const MULTIPLAYER_CHARACTERS: CharacterID[] = ['analyst', 'hustler'];

interface BaseScreen {
  mount(container: HTMLElement): void;
  unmount(): void;
}

export class MultiplayerArenaScreen implements BaseScreen {
  private container: HTMLElement | null = null;
  private store: GameStore;
  private mpStore: MultiplayerStore;
  private orchestrator: MultiplayerOrchestrator;
  private sfx: SoundEffects;
  private unsubscribes: Array<() => void> = [];
  private videoEl: HTMLVideoElement | null = null;

  // Overlay node refs
  private waitingOverlay: HTMLElement | null = null;
  private countdownOverlay: HTMLElement | null = null;
  private decisionOverlay: HTMLElement | null = null;
  private outcomeFlash: HTMLElement | null = null;
  private momentEl: HTMLElement | null = null;
  private hudStatusEl: HTMLElement | null = null;
  private hudProgressFill: HTMLElement | null = null;
  private seatLeftName: HTMLElement | null = null;
  private seatRightName: HTMLElement | null = null;
  private seatLeftScore: HTMLElement | null = null;
  private seatRightScore: HTMLElement | null = null;
  private hudPortfolioLeft: HTMLElement | null = null;
  private hudPortfolioRight: HTMLElement | null = null;
  private hudDecisionLeft: HTMLElement | null = null;
  private hudDecisionRight: HTMLElement | null = null;
  private readTokensEl: HTMLElement | null = null;
  private momentTimeout: ReturnType<typeof setTimeout> | null = null;
  private outcomeTimeout: ReturnType<typeof setTimeout> | null = null;
  private decisionTimerInterval: ReturnType<typeof setInterval> | null = null;

  // Character pick (multiplayer config)
  private selectedCharacter: CharacterID | null = null;

  // Trading terminal (sandbox-style gameplay)
  private terminalLayer: HTMLElement | null = null;
  private taskbarEl: HTMLElement | null = null;
  private terminalWindows: Map<number, TerminalWindow> = new Map();
  private nextTerminalId = 1;
  private allocations: Map<string, { percentage: number; position: 'long' | 'short' }> = new Map();
  private rebalanceDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private newsOverlay: NewsOverlay | null = null;
  private lastNewsKey: string | null = null;
  private gameLoopUnsub: (() => void) | null = null;
  private audio: AudioEngine;

  // Decision state
  private selectedChoice: 'a' | 'b' | null = null;
  private selectedIntent: HiddenIntent = 'neutral';
  private bluffAction: BluffAction = 'none';
  private useReadToken = false;

  constructor(store: GameStore, audio: AudioEngine) {
    this.store = store;
    this.audio = audio;
    this.sfx = new SoundEffects(audio);
    this.mpStore = new MultiplayerStore();
    this.orchestrator = new MultiplayerOrchestrator(this.mpStore);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'arena-screen';

    // ── Video background (80% centred, home-screen style) ─────────────────
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'arena-screen__video-wrapper';

    const video = document.createElement('video');
    video.className = 'arena-screen__video';
    video.src = LOBBY_VIDEO_URL;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
    this.videoEl = video;
    videoWrapper.appendChild(video);

    // Bottom gradient so HUD elements are always readable
    const gradientEl = document.createElement('div');
    gradientEl.className = 'arena-screen__video-wrapper-gradient';
    videoWrapper.appendChild(gradientEl);

    wrapper.appendChild(videoWrapper);

    // Scanlines node kept for DOM compat — hidden via CSS
    const scanlines = document.createElement('div');
    scanlines.className = 'arena-screen__scanlines';
    wrapper.appendChild(scanlines);

    // ── Overlay layer ─────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.className = 'arena-overlay';

    // Seat anchors
    overlay.appendChild(this.buildSeat('left'));
    overlay.appendChild(this.buildSeat('right'));

    wrapper.appendChild(overlay);

    // ── News ticker ───────────────────────────────────────────────────────
    const tickerHost = document.createElement('div');
    tickerHost.className = 'arena-news-ticker';
    tickerHost.style.display = 'none';
    wrapper.appendChild(tickerHost);

    // ── Terminal layer (sandbox-style trading UI, shown during playing phase) ──
    const terminalLayer = document.createElement('div');
    terminalLayer.className = 'trading-screen__terminal-layer';
    terminalLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:30;display:none;';
    wrapper.appendChild(terminalLayer);
    this.terminalLayer = terminalLayer;

    // ── Taskbar (spawn terminal button) ──────────────────────────────────
    const taskbarEl = document.createElement('div');
    taskbarEl.className = 'terminal-taskbar';
    taskbarEl.style.display = 'none';
    wrapper.appendChild(taskbarEl);
    this.taskbarEl = taskbarEl;

    // ── Bottom HUD ────────────────────────────────────────────────────────
    wrapper.appendChild(this.buildHUD());

    container.appendChild(wrapper);

    // ── Subscribe to multiplayer store ────────────────────────────────────
    const unsub = this.orchestrator.subscribe(() => {
      this.onStateUpdate();
    });
    this.unsubscribes.push(unsub);

    // Show initial landing panel
    this.showLandingPanel(wrapper);
  }

  // ── Auto-register player if not yet done ─────────────────────────────────

  private async ensurePlayer(): Promise<string | null> {
    const appState = this.store.getState();
    if (appState.playerId) return appState.playerId;

    const avatar = this.selectedCharacter ? this.getCharacterAvatar(this.selectedCharacter) : '🎮';

    // Try to fetch existing player for this device first
    let player = await PlayerService.getPlayer();
    if (!player) {
      player = await PlayerService.createPlayer(appState.nickname || 'Duelist', avatar);
    } else {
      // Update avatar to match newly chosen character
      player = await PlayerService.createPlayer(appState.nickname || player.nickname, avatar) ?? player;
    }
    if (player) {
      this.store.setState({ playerId: player.id, nickname: appState.nickname || player.nickname });
      return player.id;
    }
    return null;
  }

  // ── Landing panel (HOST vs JOIN two-column card) ──────────────────────────

  private showLandingPanel(wrapper: HTMLElement): void {
    wrapper.querySelector('.arena-config')?.remove();

    const configEl = document.createElement('div');
    configEl.className = 'arena-config';

    const panel = document.createElement('div');
    panel.className = 'arena-config__panel arena-landing';

    const title = document.createElement('div');
    title.className = 'arena-config__title';
    title.textContent = '⚔  DUEL ARENA';
    panel.appendChild(title);

    const cols = document.createElement('div');
    cols.className = 'arena-landing__cols';

    // ── HOST side ──────────────────────────────────────────────────────────
    const hostSide = document.createElement('div');
    hostSide.className = 'arena-landing__side';

    const hostHeading = document.createElement('div');
    hostHeading.className = 'arena-landing__heading';
    hostHeading.textContent = 'HOST A DUEL';

    const hostDesc = document.createElement('div');
    hostDesc.className = 'arena-landing__desc';
    hostDesc.textContent = 'Pick your market and get a join code';

    const hostBtn = new PixelButton('START →', () => {
      this.sfx.buttonPress();
      this.showCharacterPicker(wrapper, 'host');
    }, 'blue', false);

    hostSide.appendChild(hostHeading);
    hostSide.appendChild(hostDesc);
    hostSide.appendChild(hostBtn.getElement());

    // ── Divider ────────────────────────────────────────────────────────────
    const divider = document.createElement('div');
    divider.className = 'arena-landing__divider';

    // ── JOIN side ──────────────────────────────────────────────────────────
    const joinSide = document.createElement('div');
    joinSide.className = 'arena-landing__side';

    const joinHeading = document.createElement('div');
    joinHeading.className = 'arena-landing__heading';
    joinHeading.textContent = 'JOIN A DUEL';

    const joinInput = document.createElement('input');
    joinInput.className = 'arena-config__input arena-landing__join-input';
    joinInput.type = 'text';
    joinInput.placeholder = 'e.g. WOLF-42';
    joinInput.maxLength = 10;
    joinInput.style.textTransform = 'uppercase';
    joinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinBtn.getElement().click();
    });

    const joinError = document.createElement('div');
    joinError.className = 'arena-config__error';

    const joinBtn = new PixelButton('JOIN →', () => {
      this.sfx.buttonPress();
      joinError.textContent = '';
      const code = joinInput.value.trim().toUpperCase();
      if (!code) { joinError.textContent = 'Enter a code first.'; return; }
      this.showCharacterPicker(wrapper, 'join', code);
    }, 'gold', false);

    joinSide.appendChild(joinHeading);
    joinSide.appendChild(joinInput);
    joinSide.appendChild(joinError);
    joinSide.appendChild(joinBtn.getElement());

    cols.appendChild(hostSide);
    cols.appendChild(divider);
    cols.appendChild(joinSide);
    panel.appendChild(cols);

    const backBtn = new PixelButton('← BACK', () => {
      this.sfx.buttonPress();
      this.store.dispatch({ type: 'SET_SCREEN', screen: 'home' });
    }, 'default', false);
    const backRow = document.createElement('div');
    backRow.style.cssText = 'margin-top:18px;';
    backRow.appendChild(backBtn.getElement());
    panel.appendChild(backRow);

    configEl.appendChild(panel);
    wrapper.appendChild(configEl);
  }

  // ── Character picker ──────────────────────────────────────────────────────

  private showCharacterPicker(wrapper: HTMLElement, mode: 'host' | 'join', joinCode?: string): void {
    wrapper.querySelector('.arena-config')?.remove();

    const configEl = document.createElement('div');
    configEl.className = 'arena-config';

    const panel = document.createElement('div');
    panel.className = 'arena-config__panel arena-char-picker';

    const title = document.createElement('div');
    title.className = 'arena-config__title';
    title.textContent = 'PICK YOUR FIGHTER';
    panel.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'arena-char-grid arena-char-grid--two';

    let selectedId: CharacterID | null = this.selectedCharacter;
    if (selectedId && !MULTIPLAYER_CHARACTERS.includes(selectedId)) {
      selectedId = null;
    }
    const cards: HTMLElement[] = [];
    const pickerVideos: HTMLVideoElement[] = [];

    for (const charId of MULTIPLAYER_CHARACTERS) {
      const char = CHARACTERS.find((c) => c.id === charId);
      if (!char) continue;

      const card = document.createElement('button');
      card.className = 'arena-char-card arena-char-card--video' + (selectedId === char.id ? ' arena-char-card--selected' : '');
      card.style.setProperty('--char-color', char.accentColor);

      const videoWrap = document.createElement('div');
      videoWrap.className = 'arena-char-card__video-wrap';

      const video = document.createElement('video');
      video.src = MULTIPLAYER_CHARACTER_VIDEOS[char.id];
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.className = 'arena-char-card__video';
      void video.play().catch(() => {});
      pickerVideos.push(video);
      videoWrap.appendChild(video);

      const nameEl = document.createElement('div');
      nameEl.className = 'arena-char-card__name';
      nameEl.style.color = char.accentColor;
      nameEl.textContent = char.name;

      const quoteEl = document.createElement('div');
      quoteEl.className = 'arena-char-card__quote';
      quoteEl.textContent = `"${char.flavourQuote}"`;

      card.appendChild(videoWrap);
      card.appendChild(nameEl);
      card.appendChild(quoteEl);

      card.addEventListener('click', () => {
        this.sfx.tabClick();
        selectedId = char.id;
        cards.forEach((c) => c.classList.remove('arena-char-card--selected'));
        card.classList.add('arena-char-card--selected');
      });

      grid.appendChild(card);
      cards.push(card);
    }
    panel.appendChild(grid);

    const stopPickerVideos = (): void => {
      for (const v of pickerVideos) {
        v.pause();
        v.removeAttribute('src');
        v.load();
      }
    };

    const errorEl = document.createElement('div');
    errorEl.className = 'arena-config__error';
    panel.appendChild(errorEl);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;margin-top:20px;';

    const backBtn = new PixelButton('← BACK', () => {
      this.sfx.buttonPress();
      stopPickerVideos();
      this.showLandingPanel(wrapper);
    }, 'default', false);

    const label = mode === 'host' ? 'NEXT →' : 'JOIN →';
    const color = mode === 'host' ? 'blue' : 'gold';

    const nextBtn = new PixelButton(label, async () => {
      if (!selectedId) { errorEl.textContent = 'Pick a character first!'; return; }
      this.sfx.buttonPress();
      this.selectedCharacter = selectedId;
      this.store.dispatch({ type: 'SELECT_CHARACTER', characterId: selectedId });

      if (mode === 'host') {
        stopPickerVideos();
        this.showMarketPicker(wrapper);
      } else {
        // JOIN flow — register player and join match
        (nextBtn.getElement() as HTMLButtonElement).disabled = true;
        nextBtn.getElement().textContent = 'JOINING...';
        const playerId = await this.ensurePlayer();
        if (!playerId) {
          errorEl.textContent = 'Could not connect. Check your internet.';
          (nextBtn.getElement() as HTMLButtonElement).disabled = false;
          nextBtn.getElement().textContent = label;
          return;
        }
        const appState = this.store.getState();
        const ok = await this.orchestrator.joinMatch(
          playerId,
          appState.nickname || 'Duelist',
          this.getCharacterAvatar(selectedId),
          joinCode!,
        );
        if (!ok) {
          errorEl.textContent = 'Code not found, match already started, or you are the host.';
          (nextBtn.getElement() as HTMLButtonElement).disabled = false;
          nextBtn.getElement().textContent = label;
        } else {
          stopPickerVideos();
        }
      }
    }, color as 'blue' | 'gold', false);

    btnRow.appendChild(backBtn.getElement());
    btnRow.appendChild(nextBtn.getElement());
    panel.appendChild(btnRow);

    configEl.appendChild(panel);
    wrapper.appendChild(configEl);
  }

  private getCharacterAvatar(id: CharacterID): string {
    const map: Record<CharacterID, string> = {
      analyst: '📊',
      hustler: '🔥',
      retiree: '🏦',
      student: '🎓',
    };
    return map[id] ?? '🎮';
  }

  // ── Market picker (inline inside config overlay) ──────────────────────────

  private static readonly DIFF_META: Record<string, { icon: string; risk: string; color: string }> = {
    easy:   { icon: '📈', risk: 'LOW RISK',    color: '#00e676' },
    medium: { icon: '📊', risk: 'MEDIUM RISK', color: '#40c4ff' },
    hard:   { icon: '🔥', risk: 'HIGH RISK',   color: '#ffd700' },
  };

  private async showMarketPicker(wrapper: HTMLElement): Promise<void> {
    wrapper.querySelector('.arena-config')?.remove();

    const configEl = document.createElement('div');
    configEl.className = 'arena-config';

    const panel = document.createElement('div');
    panel.className = 'arena-config__panel';

    const title = document.createElement('div');
    title.className = 'arena-config__title';
    title.textContent = 'CHOOSE BATTLEGROUND';
    panel.appendChild(title);

    const seeds = await SeedService.fetchSeeds();

    if (seeds.length === 0) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'arena-config__error';
      errorMsg.textContent = 'No market scenarios found in the database. Check your seeds table.';
      panel.appendChild(errorMsg);
      const backBtn = new PixelButton('← BACK', () => {
        this.sfx.buttonPress();
        this.showLandingPanel(wrapper);
      }, 'default', false);
      panel.appendChild(backBtn.getElement());
      configEl.appendChild(panel);
      wrapper.appendChild(configEl);
      return;
    }

    let selectedMarket = seeds[0].id;

    const tilesEl = document.createElement('div');
    tilesEl.className = 'arena-market-picker';

    const tileBtns: HTMLElement[] = [];
    for (const seed of seeds) {
      const meta = MultiplayerArenaScreen.DIFF_META[seed.difficulty] ?? MultiplayerArenaScreen.DIFF_META.medium;
      const tile = document.createElement('button');
      tile.className = 'arena-market-tile' + (seed.id === selectedMarket ? ' arena-market-tile--selected' : '');
      tile.style.setProperty('--tile-color', meta.color);

      const tileIcon = document.createElement('div');
      tileIcon.className = 'arena-market-tile__icon';
      tileIcon.textContent = meta.icon;

      const tileLabel = document.createElement('div');
      tileLabel.className = 'arena-market-tile__label';
      tileLabel.textContent = seed.name.toUpperCase();

      const tileRisk = document.createElement('div');
      tileRisk.className = 'arena-market-tile__risk';
      tileRisk.textContent = `${seed.difficulty.toUpperCase()} • ${meta.risk}`;

      tile.appendChild(tileIcon);
      tile.appendChild(tileLabel);
      tile.appendChild(tileRisk);

      tile.addEventListener('click', () => {
        selectedMarket = seed.id;
        tileBtns.forEach((b) => b.classList.remove('arena-market-tile--selected'));
        tile.classList.add('arena-market-tile--selected');
        this.sfx.tabClick();
      });

      tilesEl.appendChild(tile);
      tileBtns.push(tile);
    }
    panel.appendChild(tilesEl);

    const errorEl = document.createElement('div');
    errorEl.className = 'arena-config__error';
    panel.appendChild(errorEl);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;margin-top:20px;';

    const backBtn = new PixelButton('← BACK', () => {
      this.sfx.buttonPress();
      this.showLandingPanel(wrapper);
    }, 'default', false);

    const createBtn = new PixelButton('CREATE MATCH', async () => {
      this.sfx.buttonPress();
      errorEl.textContent = '';
      (createBtn.getElement() as HTMLButtonElement).disabled = true;
      createBtn.getElement().textContent = 'CREATING...';
      const playerId = await this.ensurePlayer();
      if (!playerId) {
        errorEl.textContent = 'Could not connect. Check your internet.';
        (createBtn.getElement() as HTMLButtonElement).disabled = false;
        createBtn.getElement().textContent = 'CREATE MATCH';
        return;
      }
      const appState = this.store.getState();
      const rules = {
        seedId: selectedMarket,
        startingPortfolio: appState.startingPortfolio || appState.startingCash || 10000,
        monthlyContribution: appState.monthlyContribution || 500,
        decisionTimeoutSeconds: 60,
        countdownSeconds: 3,
      };
      const avatar = this.selectedCharacter ? this.getCharacterAvatar(this.selectedCharacter) : '🎮';
      const ok = await this.orchestrator.createMatch(
        playerId,
        appState.nickname || 'Duelist',
        avatar,
        rules,
      );
      if (!ok) {
        errorEl.textContent = 'Failed to create match. Check connection.';
        (createBtn.getElement() as HTMLButtonElement).disabled = false;
        createBtn.getElement().textContent = 'CREATE MATCH';
      }
    }, 'blue', true);

    btnRow.appendChild(backBtn.getElement());
    btnRow.appendChild(createBtn.getElement());
    panel.appendChild(btnRow);

    configEl.appendChild(panel);
    wrapper.appendChild(configEl);
  }

  // ── Seat elements ──────────────────────────────────────────────────────────

  private buildSeat(side: 'left' | 'right'): HTMLElement {
    const seat = document.createElement('div');
    seat.className = `arena-seat arena-seat--${side}`;
    seat.id = `arena-seat-${side}`;

    const scoreEl = document.createElement('div');
    scoreEl.className = 'arena-seat__decision-score';
    scoreEl.style.display = 'none';
    seat.appendChild(scoreEl);

    const avatar = document.createElement('div');
    avatar.className = 'arena-seat__avatar';
    avatar.textContent = '🎮';
    seat.appendChild(avatar);

    const name = document.createElement('div');
    name.className = 'arena-seat__name';
    name.textContent = side === 'left' ? 'YOU' : '???';
    seat.appendChild(name);

    const badge = document.createElement('div');
    badge.className = 'arena-seat__status-badge arena-seat__status-badge--waiting';
    badge.textContent = 'WAITING';
    seat.appendChild(badge);

    if (side === 'left') {
      this.seatLeftName = name;
      this.seatLeftScore = scoreEl;
    } else {
      this.seatRightName = name;
      this.seatRightScore = scoreEl;
    }

    return seat;
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private buildHUD(): HTMLElement {
    const hud = document.createElement('div');
    hud.className = 'arena-hud';

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'arena-hud__progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'arena-hud__progress-fill';
    progressFill.style.width = '0%';
    progressBar.appendChild(progressFill);
    this.hudProgressFill = progressFill;
    hud.appendChild(progressBar);

    // Score strip
    const scores = document.createElement('div');
    scores.className = 'arena-hud__scores';

    const leftCard = document.createElement('div');
    leftCard.className = 'arena-hud__player-card';
    const leftName = document.createElement('div');
    leftName.className = 'arena-hud__player-name';
    leftName.textContent = 'YOU';
    const leftPortfolio = document.createElement('div');
    leftPortfolio.className = 'arena-hud__portfolio';
    leftPortfolio.textContent = 'CHF —';
    const leftDecision = document.createElement('div');
    leftDecision.className = 'arena-hud__decision-score';
    leftDecision.textContent = 'EDGE 0';
    leftCard.appendChild(leftName);
    leftCard.appendChild(leftPortfolio);
    leftCard.appendChild(leftDecision);
    this.hudPortfolioLeft = leftPortfolio;
    this.hudDecisionLeft = leftDecision;

    const vs = document.createElement('div');
    vs.className = 'arena-hud__vs';
    vs.textContent = 'VS';

    const rightCard = document.createElement('div');
    rightCard.className = 'arena-hud__player-card arena-hud__player-card--right';
    const rightName = document.createElement('div');
    rightName.className = 'arena-hud__player-name';
    rightName.textContent = '???';
    const rightPortfolio = document.createElement('div');
    rightPortfolio.className = 'arena-hud__portfolio';
    rightPortfolio.textContent = 'CHF —';
    const rightDecision = document.createElement('div');
    rightDecision.className = 'arena-hud__decision-score';
    rightDecision.textContent = 'EDGE 0';
    rightCard.appendChild(rightName);
    rightCard.appendChild(rightPortfolio);
    rightCard.appendChild(rightDecision);
    this.hudPortfolioRight = rightPortfolio;
    this.hudDecisionRight = rightDecision;

    scores.appendChild(leftCard);
    scores.appendChild(vs);
    scores.appendChild(rightCard);
    hud.appendChild(scores);

    // Sim status
    const statusEl = document.createElement('div');
    statusEl.className = 'arena-hud__status';
    statusEl.textContent = 'Waiting for opponent...';
    this.hudStatusEl = statusEl;
    hud.appendChild(statusEl);

    // Read tokens
    const readTokensEl = document.createElement('div');
    readTokensEl.className = 'arena-hud__read-tokens';
    readTokensEl.style.justifyContent = 'center';
    readTokensEl.style.marginBottom = '4px';
    this.readTokensEl = readTokensEl;
    hud.appendChild(readTokensEl);

    // Controls row (play/pause/speed/rebalance)
    const controls = document.createElement('div');
    controls.className = 'arena-hud__controls';

    const playBtn = new PixelButton('▶ PLAY', () => {
      this.sfx.buttonPress();
      const engines = (window as unknown as Record<string, unknown>).__gameEngines as
        { gameLoop: GameLoop } | undefined;
      if (engines?.gameLoop) {
        const phase = engines.gameLoop.getPhase();
        if (phase === 'paused' || phase === 'idle') engines.gameLoop.play();
        else if (phase === 'simulating') engines.gameLoop.pause();
      }
    }, 'blue', false);
    controls.appendChild(playBtn.getElement());

    for (const speed of [1, 3, 5] as const) {
      const label = `${speed}×`;
      const speedBtn = new PixelButton(label, () => {
        this.sfx.tabClick();
        const engines = (window as unknown as Record<string, unknown>).__gameEngines as
          { gameLoop: GameLoop } | undefined;
        engines?.gameLoop?.setSpeed(speed);
      }, 'default', false);
      controls.appendChild(speedBtn.getElement());
    }

    const skipBtn = new PixelButton('⏩ SKIP YEAR', () => {
      this.sfx.timeskipWhoosh();
      const engines = (window as unknown as Record<string, unknown>).__gameEngines as
        { gameLoop: GameLoop } | undefined;
      engines?.gameLoop?.skipYear();
    }, 'gold', false);
    controls.appendChild(skipBtn.getElement());

    hud.appendChild(controls);

    return hud;
  }

  // ── Waiting overlay ────────────────────────────────────────────────────────

  private showWaitingOverlay(): void {
    this.waitingOverlay?.remove();
    const wrapper = this.container?.firstElementChild as HTMLElement;
    if (!wrapper) return;

    // Remove config panel
    wrapper.querySelector('.arena-config')?.remove();

    const el = document.createElement('div');
    el.className = 'arena-waiting';

    const title = document.createElement('div');
    title.className = 'arena-waiting__title';
    title.textContent = 'WAITING FOR OPPONENT';

    const state = this.mpStore.getState();
    const codeLabel = document.createElement('div');
    codeLabel.className = 'arena-waiting__code-label';
    codeLabel.textContent = 'SHARE THIS CODE:';

    const code = document.createElement('div');
    code.className = 'arena-waiting__code';
    code.textContent = state.joinCode ?? '···';

    const pulse = document.createElement('div');
    pulse.className = 'arena-waiting__pulse';
    pulse.textContent = 'waiting...';

    const readyBtn = new PixelButton('READY ✓', async () => {
      this.sfx.buttonPress();
      await this.orchestrator.signalReady();
      pulse.textContent = 'You are ready!';
      (readyBtn.getElement() as HTMLButtonElement).disabled = true;
    }, 'green', true);

    const cancelBtn = new PixelButton('CANCEL', () => {
      this.sfx.buttonPress();
      this.mpStore.dispatch({ type: 'RESET' });
      this.orchestrator.destroy();
      this.store.dispatch({ type: 'SET_SCREEN', screen: 'home' });
    }, 'default', false);

    el.appendChild(title);
    el.appendChild(codeLabel);
    el.appendChild(code);
    el.appendChild(pulse);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:16px;';
    btnRow.appendChild(cancelBtn.getElement());
    btnRow.appendChild(readyBtn.getElement());
    el.appendChild(btnRow);

    wrapper.appendChild(el);
    this.waitingOverlay = el;
  }

  // ── Countdown overlay ──────────────────────────────────────────────────────

  private showCountdown(seconds: number): void {
    if (!this.countdownOverlay) {
      const wrapper = this.container?.firstElementChild as HTMLElement;
      if (!wrapper) return;
      this.waitingOverlay?.remove();
      this.waitingOverlay = null;

      const el = document.createElement('div');
      el.className = 'arena-countdown';
      const num = document.createElement('div');
      num.className = 'arena-countdown__number';
      num.id = 'arena-countdown-num';
      const lbl = document.createElement('div');
      lbl.className = 'arena-countdown__label';
      lbl.textContent = 'DUEL STARTING';
      el.appendChild(num);
      el.appendChild(lbl);
      wrapper.appendChild(el);
      this.countdownOverlay = el;
    }

    const numEl = this.countdownOverlay.querySelector('#arena-countdown-num') as HTMLElement;
    if (numEl) {
      numEl.textContent = seconds > 0 ? String(seconds) : 'GO!';
      // Re-trigger animation
      numEl.classList.remove('arena-countdown__number');
      void numEl.offsetWidth;
      numEl.classList.add('arena-countdown__number');
    }

    if (seconds <= 0) {
      setTimeout(() => {
        this.countdownOverlay?.remove();
        this.countdownOverlay = null;
        this.sfx.levelUpArpeggio();
      }, 800);
    } else {
      this.sfx.buttonPress();
    }
  }

  // ── Decision overlay ───────────────────────────────────────────────────────

  private showDecisionOverlay(): void {
    this.decisionOverlay?.remove();
    const wrapper = this.container?.firstElementChild as HTMLElement;
    if (!wrapper) return;

    const state = this.mpStore.getState();
    const decisionWindow = state.activeDecisionWindow;
    if (!decisionWindow) return;

    const engines = (globalThis as unknown as Record<string, unknown>).__gameEngines as
      { gameLoop: GameLoop } | undefined;
    const activeEvent = (engines as { gameLoop?: GameLoop })?.gameLoop?.activeEvent;

    this.selectedChoice = null;
    this.selectedIntent = 'neutral';
    this.bluffAction = 'none';
    this.useReadToken = false;

    const overlay = document.createElement('div');
    overlay.className = 'arena-decision';

    const panel = document.createElement('div');
    panel.className = 'arena-decision__panel';

    // Header
    const header = document.createElement('div');
    header.className = 'arena-decision__header';
    const iconEl = document.createElement('span');
    iconEl.className = 'arena-decision__icon';
    iconEl.textContent = activeEvent?.icon ?? '📰';
    const titleEl = document.createElement('div');
    titleEl.className = 'arena-decision__title';
    titleEl.textContent = activeEvent?.title ?? 'MARKET EVENT';
    const timerEl = document.createElement('div');
    timerEl.className = 'arena-decision__timer';
    header.appendChild(iconEl);
    header.appendChild(titleEl);
    header.appendChild(timerEl);
    panel.appendChild(header);

    // Body
    const bodyEl = document.createElement('div');
    bodyEl.className = 'arena-decision__body';
    bodyEl.textContent = activeEvent?.description ?? 'A key moment. Choose wisely.';
    panel.appendChild(bodyEl);

    // A/B choices
    const choicesEl = document.createElement('div');
    choicesEl.className = 'arena-decision__choices';

    const choices: Array<{ key: 'a' | 'b'; label: string; hint: string }> = [
      {
        key: 'a',
        label: activeEvent?.optionA.label ?? 'OPTION A',
        hint: activeEvent?.optionA.hint ?? '',
      },
      {
        key: 'b',
        label: activeEvent?.optionB.label ?? 'OPTION B',
        hint: activeEvent?.optionB.hint ?? '',
      },
    ];

    const choiceBtns: HTMLElement[] = [];
    for (const c of choices) {
      const col = document.createElement('div');
      const btn = document.createElement('button');
      btn.className = 'arena-decision__choice-btn';
      btn.textContent = c.label;
      const hint = document.createElement('div');
      hint.className = 'arena-decision__choice-hint';
      hint.textContent = c.hint;
      btn.addEventListener('click', () => {
        this.selectedChoice = c.key;
        choiceBtns.forEach((b) => b.classList.remove('arena-decision__choice-btn--selected'));
        btn.classList.add('arena-decision__choice-btn--selected');
        this.sfx.tabClick();
      });
      col.appendChild(btn);
      col.appendChild(hint);
      choicesEl.appendChild(col);
      choiceBtns.push(btn);
    }
    panel.appendChild(choicesEl);

    // Intent selector
    const intentSection = document.createElement('div');
    intentSection.className = 'arena-decision__intent-section';
    const intentLabel = document.createElement('div');
    intentLabel.className = 'arena-decision__section-label';
    intentLabel.textContent = 'YOUR HIDDEN INTENT';
    intentSection.appendChild(intentLabel);

    const intentsEl = document.createElement('div');
    intentsEl.className = 'arena-decision__intents';

    const intents: Array<{ value: HiddenIntent; label: string }> = [
      { value: 'defensive', label: '🛡 SAFE' },
      { value: 'neutral',   label: '⚖ NEUTRAL' },
      { value: 'aggressive', label: '⚔ BOLD' },
    ];

    const intentBtns: HTMLElement[] = [];
    for (const intent of intents) {
      const btn = document.createElement('button');
      btn.className = `arena-decision__intent-btn arena-decision__intent-btn--${intent.value}`;
      if (intent.value === 'neutral') btn.classList.add('arena-decision__intent-btn--selected');
      btn.textContent = intent.label;
      btn.addEventListener('click', () => {
        this.selectedIntent = intent.value;
        intentBtns.forEach((b) => b.classList.remove('arena-decision__intent-btn--selected'));
        btn.classList.add('arena-decision__intent-btn--selected');
        this.sfx.tabClick();
      });
      intentsEl.appendChild(btn);
      intentBtns.push(btn);
    }
    intentSection.appendChild(intentsEl);
    panel.appendChild(intentSection);

    // Mind-game actions
    const mgSection = document.createElement('div');
    mgSection.className = 'arena-decision__section-label';
    mgSection.style.marginBottom = '6px';
    mgSection.textContent = 'MIND GAME';
    panel.appendChild(mgSection);

    const mgRow = document.createElement('div');
    mgRow.className = 'arena-decision__mindgame';

    const readTokensLeft = state.myReadTokensLeft;
    const readBtn = document.createElement('button');
    readBtn.className = 'arena-decision__mindgame-btn' +
      (readTokensLeft <= 0 ? ' arena-decision__mindgame-btn--disabled' : '');
    readBtn.textContent = `🔍 READ (${readTokensLeft})`;
    readBtn.title = 'Spend a token to predict opponent intent (+8 if correct, -8 for opponent)';
    readBtn.disabled = readTokensLeft <= 0;
    readBtn.addEventListener('click', () => {
      if (readBtn.disabled) return;
      this.useReadToken = !this.useReadToken;
      readBtn.classList.toggle('arena-decision__mindgame-btn--active', this.useReadToken);
      this.sfx.tabClick();
    });
    mgRow.appendChild(readBtn);

    const bluffBtn = document.createElement('button');
    bluffBtn.className = 'arena-decision__mindgame-btn';
    bluffBtn.textContent = '🎭 BLUFF';
    bluffBtn.title = 'Bluff: +6 if opponent does not call, -4 if they do';
    bluffBtn.addEventListener('click', () => {
      if (this.bluffAction === 'bluff') {
        this.bluffAction = 'none';
        bluffBtn.classList.remove('arena-decision__mindgame-btn--active');
        callBtn.classList.remove('arena-decision__mindgame-btn--disabled');
      } else {
        this.bluffAction = 'bluff';
        bluffBtn.classList.add('arena-decision__mindgame-btn--active');
        callBtn.classList.add('arena-decision__mindgame-btn--disabled');
      }
      this.sfx.tabClick();
    });
    mgRow.appendChild(bluffBtn);

    const callBtn = document.createElement('button');
    callBtn.className = 'arena-decision__mindgame-btn';
    callBtn.textContent = '🎯 CALL BLUFF';
    callBtn.title = 'Call opponent bluff: +10 if they bluffed, nothing if they did not';
    callBtn.addEventListener('click', () => {
      if (this.bluffAction === 'call_bluff') {
        this.bluffAction = 'none';
        callBtn.classList.remove('arena-decision__mindgame-btn--active');
        bluffBtn.classList.remove('arena-decision__mindgame-btn--disabled');
      } else {
        this.bluffAction = 'call_bluff';
        callBtn.classList.add('arena-decision__mindgame-btn--active');
        bluffBtn.classList.add('arena-decision__mindgame-btn--disabled');
      }
      this.sfx.tabClick();
    });
    mgRow.appendChild(callBtn);

    panel.appendChild(mgRow);

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'arena-decision__submit';
    submitBtn.textContent = 'SUBMIT DECISION';
    submitBtn.addEventListener('click', async () => {
      if (!this.selectedChoice) {
        submitBtn.textContent = 'PICK A OR B FIRST!';
        setTimeout(() => { submitBtn.textContent = 'SUBMIT DECISION'; }, 1200);
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'SUBMITTING...';
      this.sfx.buttonPress();

      const submission: DecisionSubmission = {
        publicChoice: this.selectedChoice,
        hiddenIntent: this.selectedIntent,
        useReadToken: this.useReadToken,
        bluffAction: this.bluffAction,
      };

      const eventKey = state.activeDecisionWindow?.eventKey ?? '';
      await this.orchestrator.submitDecision(eventKey, submission);

      if (submission.useReadToken) {
        this.mpStore.dispatch({ type: 'SPEND_READ_TOKEN' });
      }

      // Also forward choice to GameLoop
      const glEngines = (globalThis as unknown as Record<string, unknown>).__gameEngines as
        { gameLoop: GameLoop } | undefined;
      await glEngines?.gameLoop?.chooseEventOption(this.selectedChoice);

      this.hideDecisionOverlay();
    });
    panel.appendChild(submitBtn);

    // Social proof placeholder
    const socialEl = document.createElement('div');
    socialEl.className = 'arena-decision__social';
    socialEl.textContent = 'Loading opponent tendency...';
    panel.appendChild(socialEl);

    overlay.appendChild(panel);
    wrapper.appendChild(overlay);
    this.decisionOverlay = overlay;

    // Timer countdown
    let secsLeft = Math.ceil((state.activeDecisionWindow!.expiresAt - Date.now()) / 1000);
    const updateTimer = (): void => {
      if (secsLeft <= 10) timerEl.classList.add('arena-decision__timer--urgent');
      timerEl.textContent = `${secsLeft}s`;
      secsLeft--;
      if (secsLeft < 0) {
        this.stopDecisionTimer();
        // Auto-submit with defaults
        if (!submitBtn.disabled) submitBtn.click();
      }
    };
    updateTimer();
    this.decisionTimerInterval = setInterval(updateTimer, 1000);
  }

  private hideDecisionOverlay(): void {
    this.stopDecisionTimer();
    this.decisionOverlay?.remove();
    this.decisionOverlay = null;
  }

  private stopDecisionTimer(): void {
    if (this.decisionTimerInterval) {
      clearInterval(this.decisionTimerInterval);
      this.decisionTimerInterval = null;
    }
  }

  // ── Outcome flash ──────────────────────────────────────────────────────────

  private showOutcomeFlash(): void {
    this.outcomeFlash?.remove();
    const state = this.mpStore.getState();
    const outcome = state.pendingOutcome;
    if (!outcome) return;

    const wrapper = this.container?.firstElementChild as HTMLElement;
    if (!wrapper) return;

    const mySlot = state.mySlot;
    const myEdge = mySlot === 'A' ? outcome.slot_a_edge : outcome.slot_b_edge;
    const myOutread = mySlot === 'A' ? outcome.slot_a_outread : outcome.slot_b_outread;
    const myBluff = mySlot === 'A' ? outcome.slot_a_bluff_success : outcome.slot_b_bluff_success;

    const flash = document.createElement('div');
    flash.className = 'arena-outcome-flash';

    const titleEl = document.createElement('div');
    titleEl.className = 'arena-outcome-flash__title';
    titleEl.textContent = 'DECISION OUTCOME';
    flash.appendChild(titleEl);

    const edgeSign = myEdge >= 0 ? '+' : '';
    const edgeEl = document.createElement('div');
    edgeEl.className = 'arena-outcome-flash__edge' +
      (myEdge > 0 ? ' arena-outcome-flash__edge--positive' :
       myEdge < 0 ? ' arena-outcome-flash__edge--negative' : '');
    edgeEl.textContent = `${edgeSign}${myEdge.toFixed(0)} EDGE`;
    flash.appendChild(edgeEl);

    const details: string[] = [];
    if (myOutread === true)  details.push('✓ Read opponent correctly!');
    if (myOutread === false) details.push('✗ Read attempt failed');
    if (myBluff === true)    details.push('✓ Bluff successful!');
    if (myBluff === false)   details.push('✗ Bluff was called!');

    if (details.length > 0) {
      const detailsEl = document.createElement('div');
      detailsEl.className = 'arena-outcome-flash__details';
      detailsEl.textContent = details.join('\n');
      flash.appendChild(detailsEl);
    }

    wrapper.appendChild(flash);
    this.outcomeFlash = flash;

    this.sfx.coinBlip();

    this.outcomeTimeout = setTimeout(() => {
      this.outcomeFlash?.remove();
      this.outcomeFlash = null;
      this.mpStore.dispatch({ type: 'CLEAR_PENDING_OUTCOME' });
    }, 3500);
  }

  // ── Moment notice (news-type flash) ───────────────────────────────────────

  showMoment(text: string, variant: 'default' | 'red' | 'gold' | 'green' = 'default'): void {
    this.momentEl?.remove();
    if (this.momentTimeout) clearTimeout(this.momentTimeout);

    const wrapper = this.container?.firstElementChild as HTMLElement;
    if (!wrapper) return;

    const el = document.createElement('div');
    el.className = `arena-moment${variant !== 'default' ? ` arena-moment--${variant}` : ''}`;

    const label = document.createElement('div');
    label.className = 'arena-moment__label';
    label.textContent = 'MATCH UPDATE';

    const textEl = document.createElement('div');
    textEl.className = 'arena-moment__text';
    textEl.textContent = text;

    el.appendChild(label);
    el.appendChild(textEl);
    wrapper.appendChild(el);
    this.momentEl = el;

    this.momentTimeout = setTimeout(() => {
      this.momentEl?.remove();
      this.momentEl = null;
    }, 4000);
  }

  // ── State update handler ──────────────────────────────────────────────────

  private onStateUpdate(): void {
    const state = this.mpStore.getState();

    this.updateHUD(state);
    this.updateSeats(state);

    // Phase transitions
    this.handlePhaseUX(state.phase);

    // Countdown
    if (state.phase === 'multiplayer-countdown') {
      this.showCountdown(state.countdownSecondsLeft);
    }

    // Decision window opened
    if (state.activeDecisionWindow && !this.decisionOverlay) {
      this.showDecisionOverlay();
    } else if (!state.activeDecisionWindow && this.decisionOverlay) {
      this.hideDecisionOverlay();
    }

    // Outcome received
    if (state.pendingOutcome && !this.outcomeFlash) {
      this.showOutcomeFlash();
    }

    // Opponent joined notice
    if (state.opponent && state.phase === 'multiplayer-waiting') {
      this.showMoment(`${state.opponent.nickname} joined the arena!`, 'green');
    }
  }

  private gameLoopStarted = false;

  private videoSwappedToArena = false;

  private handlePhaseUX(phase: MultiplayerPhase): void {
    if (phase === 'multiplayer-waiting' && !this.waitingOverlay) {
      this.showWaitingOverlay();
    }
    if (phase === 'multiplayer-countdown' && !this.videoSwappedToArena && this.videoEl) {
      this.videoSwappedToArena = true;
      // Keep showing the lobby video during countdown; swap happens on game start
    }
    if (phase === 'multiplayer-playing' && this.videoEl && this.videoEl.src !== MATCH_STARTED_VIDEO_URL && this.videoEl.src !== MATCH_GOING_VIDEO_URL) {
      this.videoEl.loop = false;
      this.videoEl.src = MATCH_STARTED_VIDEO_URL;
      this.videoEl.load();
      void this.videoEl.play().catch(() => {});
      this.videoEl.onended = () => {
        if (this.videoEl) {
          this.videoEl.onended = null;
          this.videoEl.loop = true;
          this.videoEl.src = MATCH_GOING_VIDEO_URL;
          this.videoEl.load();
          void this.videoEl.play().catch(() => {});
        }
      };
    }
    if (phase === 'multiplayer-playing' && !this.gameLoopStarted) {
      this.gameLoopStarted = true;
      if (this.waitingOverlay) {
        this.waitingOverlay.remove();
        this.waitingOverlay = null;
      }
      if (this.countdownOverlay) {
        this.countdownOverlay.remove();
        this.countdownOverlay = null;
      }
      this.startGameLoop();
    }
    if (phase === 'multiplayer-results') {
      this.showResults();
    }
  }

  private async startGameLoop(): Promise<void> {
    const engines = (window as unknown as Record<string, unknown>).__gameEngines as
      { gameLoop: GameLoop } | undefined;
    const mpState = this.mpStore.getState();

    if (!engines?.gameLoop || !mpState.rules) {
      console.error('[MultiplayerArena] Cannot start game — missing gameLoop or rules');
      return;
    }

    let state = this.store.getState();

    if (!state.seedData && mpState.rules.seedId) {
      const seedData = await SeedService.fetchSeedData(mpState.rules.seedId);
      if (seedData) {
        this.store.setState({ seedData });
        state = this.store.getState();
      } else {
        console.error('[MultiplayerArena] Failed to fetch seed data for', mpState.rules.seedId);
        this.showMoment('Failed to load market data!', 'red');
        return;
      }
    }

    if (!state.seedData) {
      console.error('[MultiplayerArena] No seed data available');
      this.showMoment('No market data available!', 'red');
      return;
    }

    this.showMoment('DUEL STARTED — INVEST WISELY!', 'gold');

    await engines.gameLoop.startGame({
      playerId: state.playerId ?? 'offline',
      seed: state.seedData.seed,
      assets: state.seedData.assets,
      prices: state.seedData.prices,
      startingPortfolio: mpState.rules.startingPortfolio,
      monthlyContribution: mpState.rules.monthlyContribution,
      allocations: [{ assetId: 'cash', pct: 100 }],
    });

    const sessionId = engines.gameLoop.getSessionId();
    if (sessionId) this.orchestrator.linkSession(sessionId);

    this.gameLoopUnsub = engines.gameLoop.subscribe(() => {
      this.onGameLoopTick(engines.gameLoop!);
    });

    // Set up sandbox-style trading UI
    this.showTradingUI();

    engines.gameLoop.play();
  }

  private showTradingUI(): void {
    // Show terminal layer and taskbar
    if (this.terminalLayer) {
      this.terminalLayer.style.display = '';
    }
    if (this.taskbarEl) {
      this.taskbarEl.style.display = '';
      this.taskbarEl.innerHTML = '';
      const spawnBtn = document.createElement('button');
      spawnBtn.className = 'terminal-taskbar__spawn';
      spawnBtn.innerHTML = '<span class="terminal-taskbar__spawn-icon">+</span> NEW TERMINAL';
      spawnBtn.addEventListener('click', () => {
        this.sfx.buttonPress();
        this.spawnTerminal();
      });
      this.taskbarEl.appendChild(spawnBtn);
    }

    // Set up news overlay
    const wrapper = this.container?.firstElementChild as HTMLElement;
    if (wrapper) {
      this.newsOverlay = new NewsOverlay();
      this.newsOverlay.mount(wrapper);
    }

    // Spawn the first terminal automatically
    this.spawnTerminal();
  }

  private spawnTerminal(initialTab?: string): void {
    if (!this.terminalLayer) return;

    const id = this.nextTerminalId++;
    const state = this.store.getState();

    const offset = (this.terminalWindows.size % 6) * 32;

    const tw = new TerminalWindow({
      id,
      title: `TERMINAL #${id}`,
      categories: state.selectedCategories,
      initialTab,
      left: 18 + offset,
      top: 18 + offset,
      onFocus: () => {},
      onClose: (winId) => this.closeTerminal(winId),
      onAllocationChange: (assetId, pct, position) => this.handleAllocationChange(assetId, pct, position),
      getGameLoop: () => {
        const gl = (window as unknown as Record<string, unknown>).__gameEngines as
          { gameLoop: GameLoop } | undefined;
        return gl?.gameLoop;
      },
      sfx: {
        tabClick: () => this.sfx.tabClick(),
        buttonPress: () => this.sfx.buttonPress(),
        timeskipWhoosh: () => this.sfx.timeskipWhoosh(),
      },
      getStoreState: () => {
        const s = this.store.getState();
        return {
          currentMonth: s.currentMonth,
          pricePaths: s.pricePaths,
          portfolioValue: s.portfolioValue,
          currentCash: s.currentCash,
          startingCash: s.startingCash,
        };
      },
    });

    this.terminalWindows.set(id, tw);

    const el = tw.getElement();
    el.classList.add('trading-screen__terminal--hidden');
    this.terminalLayer.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.remove('trading-screen__terminal--hidden');
      el.classList.add('trading-screen__terminal--enter');
      setTimeout(() => el.classList.remove('trading-screen__terminal--enter'), 800);
    });

    // Feed current data immediately
    const gl = (window as unknown as Record<string, unknown>).__gameEngines as
      { gameLoop: GameLoop } | undefined;
    if (gl?.gameLoop) {
      tw.onTick(gl.gameLoop);
    }
  }

  private closeTerminal(id: number): void {
    const tw = this.terminalWindows.get(id);
    if (!tw) return;
    tw.destroy();
    this.terminalWindows.delete(id);
  }

  private handleAllocationChange(assetId: string, pct: number, position: 'long' | 'short'): void {
    this.allocations.set(assetId, { percentage: pct, position });

    const glEngines = (window as unknown as Record<string, unknown>).__gameEngines as
      { gameLoop: GameLoop } | undefined;
    if (glEngines?.gameLoop) {
      const totalAllocPct = Array.from(this.allocations.values()).reduce((s, a) => s + a.percentage, 0);
      const cashPct = Math.max(0, 100 - totalAllocPct);
      const newAllocs: Array<{ assetId: string; pct: number }> = [];
      for (const [id, alloc] of this.allocations) {
        if (alloc.percentage > 0) newAllocs.push({ assetId: id, pct: alloc.percentage });
      }
      if (cashPct > 0) newAllocs.push({ assetId: 'cash', pct: cashPct });

      if (this.rebalanceDebounceTimer) clearTimeout(this.rebalanceDebounceTimer);
      this.rebalanceDebounceTimer = setTimeout(() => {
        this.rebalanceDebounceTimer = null;
        glEngines.gameLoop?.rebalance(newAllocs);
      }, 220);
    }
  }

  private onGameLoopTick(gameLoop: GameLoop): void {
    const simState = gameLoop.getState();
    const phase = gameLoop.getPhase();

    // Update all terminal windows
    for (const tw of this.terminalWindows.values()) {
      tw.onTick(gameLoop);
    }

    // Show historical news
    if (gameLoop.historicalNews && gameLoop.historicalNews.name !== this.lastNewsKey) {
      this.lastNewsKey = gameLoop.historicalNews.name;
      this.newsOverlay?.show(gameLoop.historicalNews.name, 5500);
    }

    // Update progress bar
    if (this.hudProgressFill) {
      this.hudProgressFill.style.width = `${gameLoop.getProgressPct()}%`;
    }

    // Update status
    if (this.hudStatusEl) {
      const year = gameLoop.getCurrentYear();
      const week = gameLoop.getCurrentWeekInYear();
      const portfolio = simState?.totalPortfolio ?? 0;
      this.hudStatusEl.textContent =
        `Year ${year} • Week ${week} • CHF ${Math.round(portfolio).toLocaleString()}`;
    }

    // Update portfolio in HUD
    if (simState && this.hudPortfolioLeft) {
      this.hudPortfolioLeft.textContent = `CHF ${Math.round(simState.totalPortfolio).toLocaleString()}`;
    }

    // Event fired → open multiplayer decision window
    if (phase === 'event' && gameLoop.activeEvent) {
      const mpState = this.mpStore.getState();
      if (!mpState.activeDecisionWindow) {
        this.orchestrator.openDecisionWindow(gameLoop.activeEvent.key);
      }
    }

    // Game over
    if (phase === 'results' && simState) {
      const mpState = this.mpStore.getState();
      if (mpState.phase === 'multiplayer-playing') {
        const compositeScore = gameLoop.compositeScore ?? 0;
        this.orchestrator.finishMatch(simState.totalPortfolio, compositeScore);
      }
    }
  }


  private updateHUD(state: ReturnType<MultiplayerStore['getState']>): void {
    if (this.hudDecisionLeft) {
      const s = state.myDecisionScore;
      this.hudDecisionLeft.textContent = `EDGE ${s >= 0 ? '+' : ''}${s.toFixed(0)}`;
    }
    if (this.hudDecisionRight && state.opponent) {
      const s = state.opponent.decisionScore;
      this.hudDecisionRight.textContent = `EDGE ${s >= 0 ? '+' : ''}${s.toFixed(0)}`;
    }
    if (this.hudPortfolioRight && state.opponent?.finalPortfolio != null) {
      this.hudPortfolioRight.textContent = `CHF ${Math.round(state.opponent.finalPortfolio).toLocaleString()}`;
    }
    this.updateReadTokens(state.myReadTokensLeft);
  }

  private updateSeats(state: ReturnType<MultiplayerStore['getState']>): void {
    const appState = this.store.getState();
    if (this.seatLeftName) {
      this.seatLeftName.textContent = appState.nickname || 'YOU';
    }
    if (this.seatRightName) {
      this.seatRightName.textContent = state.opponent?.nickname ?? '???';
    }
    if (this.seatLeftScore) {
      const myScore = state.myDecisionScore;
      const show = myScore !== 0;
      this.seatLeftScore.style.display = show ? 'block' : 'none';
      this.seatLeftScore.textContent = `${myScore >= 0 ? '+' : ''}${myScore.toFixed(0)} edge`;
    }
    if (this.seatRightScore && state.opponent) {
      const score = state.opponent.decisionScore;
      const show = score !== 0;
      this.seatRightScore.style.display = show ? 'block' : 'none';
      this.seatRightScore.textContent = `${score >= 0 ? '+' : ''}${score.toFixed(0)} edge`;
    }
  }

  private updateReadTokens(tokensLeft: number): void {
    if (!this.readTokensEl) return;
    this.readTokensEl.innerHTML = '';
    const label = document.createElement('span');
    label.textContent = 'READ:';
    this.readTokensEl.appendChild(label);
    for (let i = 0; i < 2; i++) {
      const dot = document.createElement('div');
      dot.className = `arena-hud__read-token-dot${i >= tokensLeft ? ' arena-hud__read-token-dot--used' : ''}`;
      this.readTokensEl.appendChild(dot);
    }
  }

  // ── Results ────────────────────────────────────────────────────────────────

  private async showResults(): Promise<void> {
    const state = this.mpStore.getState();
    const result = state.matchResult;
    if (!result) return;

    const wrapper = this.container?.firstElementChild as HTMLElement;
    if (!wrapper) return;

    const matchId = state.matchId ?? '';
    const [allMoves, allOutcomes] = await Promise.all([
      MatchService.fetchAllMatchMoves(matchId),
      MatchService.fetchMatchOutcomes(matchId),
    ]);

    const appState = this.store.getState();
    const duel = new DuelResultsScreen({
      host: wrapper,
      result,
      myNickname: appState.nickname || 'YOU',
      opponentNickname: state.opponent?.nickname || 'OPPONENT',
      allMoves,
      allOutcomes,
      onPlayAgain: () => {
        duel.remove();
        // Reset trading UI state
        this.gameLoopUnsub?.();
        this.gameLoopUnsub = null;
        this.newsOverlay?.destroy();
        this.newsOverlay = null;
        this.lastNewsKey = null;
        for (const tw of this.terminalWindows.values()) tw.destroy();
        this.terminalWindows.clear();
        this.allocations.clear();
        this.nextTerminalId = 1;
        if (this.terminalLayer) this.terminalLayer.style.display = 'none';
        if (this.taskbarEl) this.taskbarEl.style.display = 'none';
        this.mpStore.dispatch({ type: 'RESET' });
        this.orchestrator.destroy();
        this.gameLoopStarted = false;
        this.videoSwappedToArena = false;
        const newOrchestrator = new MultiplayerOrchestrator(this.mpStore);
        (this as unknown as Record<string, unknown>).orchestrator = newOrchestrator;
        if (this.videoEl) {
          this.videoEl.src = LOBBY_VIDEO_URL;
          this.videoEl.load();
          void this.videoEl.play().catch(() => {});
        }
        this.showLandingPanel(wrapper);
      },
      onHome: () => {
        this.store.dispatch({ type: 'SET_SCREEN', screen: 'home' });
      },
    });
    duel.render();
  }

  // ── Unmount ────────────────────────────────────────────────────────────────

  unmount(): void {
    this.stopDecisionTimer();
    if (this.momentTimeout) clearTimeout(this.momentTimeout);
    if (this.outcomeTimeout) clearTimeout(this.outcomeTimeout);
    if (this.rebalanceDebounceTimer) {
      clearTimeout(this.rebalanceDebounceTimer);
      this.rebalanceDebounceTimer = null;
    }
    this.gameLoopUnsub?.();
    this.gameLoopUnsub = null;
    this.newsOverlay?.destroy();
    this.newsOverlay = null;
    this.lastNewsKey = null;
    for (const tw of this.terminalWindows.values()) {
      tw.destroy();
    }
    this.terminalWindows.clear();
    this.terminalLayer = null;
    this.taskbarEl = null;
    this.allocations.clear();
    this.orchestrator.destroy();
    for (const unsub of this.unsubscribes) unsub();
    this.unsubscribes = [];
    this.gameLoopStarted = false;
    this.videoSwappedToArena = false;
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.src = '';
      this.videoEl = null;
    }
    if (this.container) this.container.innerHTML = '';
  }
}
