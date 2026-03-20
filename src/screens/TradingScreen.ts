import '../styles/trading.css';
import { GameStore } from '../state/GameStore';
import { AudioEngine } from '../audio/AudioEngine';
import { SoundEffects } from '../audio/SoundEffects';
import { NewsOverlay } from '../components/ui/NewsOverlay';
import { EventPopup, type EventPopupChoicePayload } from '../components/ui/EventPopup';
import { CoachPopup } from '../components/ui/CoachPopup';
import { TutorialCarousel } from '../components/ui/TutorialCarousel';
import { TerminalWindow } from '../components/trading/TerminalWindow';
import { GameLoop } from '../engine/GameLoop';
import type { CoachContext } from '../engine/coach-prompts';
import { useCoach } from '../lib/hooks/useCoach';
interface BaseScreen {
  mount(container: HTMLElement): void;
  unmount(): void;
}

const BEGINNING_VIDEO_URL = new URL('../animations/characters/1ch_beginning.mp4', import.meta.url).href;
const LOOP_VIDEO_URL = new URL('../animations/characters/1ch_loop.mp4', import.meta.url).href;

const REBALANCE_DEBOUNCE_MS = 220;

export class TradingScreen implements BaseScreen {
  private store: GameStore;
  private sfx: SoundEffects;
  private container: HTMLElement | null = null;
  private unsubscribes: Array<() => void> = [];
  private introVideo: HTMLVideoElement | null = null;
  private loopVideo: HTMLVideoElement | null = null;
  private terminalWindows: Map<number, TerminalWindow> = new Map();
  private nextTerminalId = 1;
  private terminalLayer: HTMLElement | null = null;
  private taskbarEl: HTMLElement | null = null;
  private allocations: Map<string, { percentage: number; position: 'long' | 'short' }> = new Map();
  private gameLoopUnsub: (() => void) | null = null;
  private newsOverlay: NewsOverlay | null = null;
  private lastNewsKey: string | null = null;
  private eventPopup: EventPopup | null = null;
  private eventPopupActive = false;
  private audio: AudioEngine;
  private rebalanceDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private coach = useCoach();
  private coachPopup: CoachPopup | null = null;
  private previousPhase: string = 'idle';
  private cashHeavyNotified = false;
  private milestoneNotified = false;
  private coachStartingPortfolio = 0;
  private tutorialCarousel: TutorialCarousel | null = null;

  constructor(store: GameStore, audio: AudioEngine) {
    this.store = store;
    this.audio = audio;
    this.sfx = new SoundEffects(audio);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';

    const state = this.store.getState();

    const wrapper = document.createElement('div');
    wrapper.className = 'trading-screen scanlines';

    const splitLayout = document.createElement('div');
    splitLayout.className = 'trading-screen__layout';

    const leftHalf = document.createElement('div');
    leftHalf.className = 'trading-screen__room';
    this.buildVideoScene(leftHalf);
    splitLayout.appendChild(leftHalf);

    // Terminal layer for all terminal windows
    this.terminalLayer = document.createElement('div');
    this.terminalLayer.className = 'trading-screen__terminal-layer';
    this.terminalLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:30;';
    splitLayout.appendChild(this.terminalLayer);

    wrapper.appendChild(splitLayout);
    container.appendChild(wrapper);

    // Taskbar for spawn button
    this.taskbarEl = document.createElement('div');
    this.taskbarEl.className = 'terminal-taskbar';

    const spawnBtn = document.createElement('button');
    spawnBtn.className = 'terminal-taskbar__spawn';
    spawnBtn.innerHTML = '<span class="terminal-taskbar__spawn-icon">+</span> NEW TERMINAL';
    spawnBtn.addEventListener('click', () => {
      this.sfx.buttonPress();
      this.spawnTerminal();
    });
    this.taskbarEl.appendChild(spawnBtn);
    wrapper.appendChild(this.taskbarEl);

    this.newsOverlay = new NewsOverlay();
    this.newsOverlay.mount(wrapper);
    this.coachStartingPortfolio = state.startingPortfolio || state.portfolioValue || 10000;
    this.cashHeavyNotified = false;
    this.milestoneNotified = false;
    this.previousPhase = 'idle';
    this.coachPopup = new CoachPopup(this.coach);
    this.coachPopup.mount(document.body);

    // Subscribe to GameLoop updates
    const glEngines = (window as unknown as Record<string, unknown>).__gameEngines as
      { gameLoop: GameLoop } | undefined;
    if (glEngines?.gameLoop) {
      this.gameLoopUnsub = glEngines.gameLoop.subscribe(() => {
        this.onGameLoopTick(glEngines.gameLoop);
      });
    }

    if (state.pendingLegacyEvent) {
      this.store.dispatch({ type: 'SET_PENDING_LEGACY_EVENT', pending: false });
      setTimeout(() => this.showEventPopup(), 400);
    }
  }

  private buildVideoScene(parent: HTMLElement): void {
    const state = this.store.getState();

    parent.style.position = 'relative';

    const stage = document.createElement('div');
    stage.className = 'trading-screen__video-stage';

    const intro = document.createElement('video');
    intro.className = 'trading-screen__bg-video trading-screen__bg-video--intro';
    intro.src = BEGINNING_VIDEO_URL;
    intro.autoplay = true;
    intro.muted = true; // autoplay reliably
    intro.playsInline = true;
    intro.loop = false;
    intro.preload = 'auto';

    const loop = document.createElement('video');
    loop.className = 'trading-screen__bg-video trading-screen__bg-video--loop';
    loop.src = LOOP_VIDEO_URL;
    loop.autoplay = false;
    loop.muted = true;
    loop.playsInline = true;
    loop.loop = true;
    loop.preload = 'auto';
    loop.style.display = 'none';

    const finishIntro = (): void => {
      intro.style.display = 'none';
      loop.style.display = 'block';
      void loop.play().catch(() => {});
      this.showTutorial();
    };

    intro.addEventListener('ended', finishIntro);

    // Start playback ASAP (ignore failures if browser blocks it)
    void intro.play().catch(() => {
      // ignore
    });

    this.introVideo = intro;
    this.loopVideo = loop;

    stage.appendChild(intro);
    stage.appendChild(loop);
    parent.appendChild(stage);

    const phaseLabel = document.createElement('div');
    phaseLabel.className = 'trading-screen__phase';
    const roundNames = ['YEAR 1 — GROWTH', 'YEAR 1.5 — CRASH', 'YEAR 2-4 — RECOVERY'];
    phaseLabel.textContent = roundNames[state.currentRound] ?? 'YEAR 1 — GROWTH';
    parent.appendChild(phaseLabel);

    const seasonLabel = document.createElement('div');
    seasonLabel.className = 'trading-screen__season';
    seasonLabel.textContent = state.season.toUpperCase();
    parent.appendChild(seasonLabel);

    // Optional: allow clicking video area to skip intro video
    const skipHint = document.createElement('button');
    skipHint.className = 'trading-screen__skip-intro';
    skipHint.textContent = 'SKIP INTRO';
    skipHint.addEventListener('click', () => {
      this.sfx.buttonPress();
      finishIntro();
      (skipHint as HTMLButtonElement).style.display = 'none';
    });
    parent.appendChild(skipHint);
  }

  private showTutorial(): void {
    this.tutorialCarousel = new TutorialCarousel(() => {
      this.tutorialCarousel = null;
      this.spawnTerminal();
    });
    this.tutorialCarousel.show(document.body);
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
        const engines = (window as unknown as Record<string, unknown>).__gameEngines as
          { gameLoop: GameLoop } | undefined;
        return engines?.gameLoop;
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

    // Immediately feed current data
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
      this.scheduleSimulationRebalance(newAllocs);
    }
  }

  private scheduleSimulationRebalance(newAllocs: Array<{ assetId: string; pct: number }>): void {
    if (this.rebalanceDebounceTimer) clearTimeout(this.rebalanceDebounceTimer);
    this.rebalanceDebounceTimer = setTimeout(() => {
      this.rebalanceDebounceTimer = null;
      const glEngines = (window as unknown as Record<string, unknown>).__gameEngines as
        { gameLoop: GameLoop } | undefined;
      const gameLoop = glEngines?.gameLoop;
      if (!gameLoop) return;
      gameLoop.rebalance(newAllocs);
      this.maybeTriggerRebalanceCoach(gameLoop, newAllocs);
    }, REBALANCE_DEBOUNCE_MS);
  }

  private buildCoachContext(gameLoop: GameLoop): Omit<CoachContext, 'trigger'> | null {
    const simState = gameLoop.getState();
    if (!simState) return null;
    return {
      totalPortfolio: simState.totalPortfolio,
      startingPortfolio: this.coachStartingPortfolio,
      positions: simState.positions.map((p) => ({
        assetId: p.assetId,
        name: p.assetId.toUpperCase(),
        pct: p.pct,
        value: p.value,
      })),
      cashPct: simState.positions.find((p) => p.assetId === 'cash')?.pct ?? 0,
      currentDrawdownPct: simState.currentDrawdownPct,
      peakPortfolio: simState.peakPortfolio,
      currentYear: gameLoop.getCurrentYear(),
      totalYears: Math.max(1, Math.floor(simState.totalTicks / 52)),
      totalRebalances: simState.totalRebalances,
      panicRebalances: simState.panicRebalances,
      cashHeavyWeeks: simState.cashHeavyWeeks,
    };
  }

  private maybeTriggerRebalanceCoach(
    gameLoop: GameLoop,
    newAllocs: Array<{ assetId: string; pct: number }>,
  ): void {
    const baseCtx = this.buildCoachContext(gameLoop);
    if (!baseCtx) return;

    const cashPct = newAllocs.find((a) => a.assetId === 'cash')?.pct ?? 0;
    const bondPct = newAllocs.find((a) => a.assetId === 'ch_bond')?.pct ?? 0;
    const goldPct = newAllocs.find((a) => a.assetId === 'gold_chf')?.pct ?? 0;
    const equityPct = Math.max(0, 100 - cashPct - bondPct - goldPct);

    if (baseCtx.currentDrawdownPct > 10 && cashPct + bondPct > 50) {
      this.coach.triggerCoach({
        ...baseCtx,
        trigger: 'panic_rebalance',
        cashPct,
      });
      return;
    }

    if (equityPct >= 90) {
      this.coach.triggerCoach({
        ...baseCtx,
        trigger: 'all_in_equity',
        positions: newAllocs.map((allocation) => ({
          assetId: allocation.assetId,
          name: allocation.assetId.toUpperCase(),
          pct: allocation.pct,
          value: (baseCtx.totalPortfolio * allocation.pct) / 100,
        })),
      });
    }
  }

  private triggerLifeEventAfterChoice(gameLoop: GameLoop, payload: EventPopupChoicePayload): void {
    const baseCtx = this.buildCoachContext(gameLoop);
    if (!baseCtx) return;
    this.coach.triggerCoach({
      ...baseCtx,
      trigger: 'life_event_after',
      chosenOption: payload.chosen,
      chosenLabel: payload.chosenLabel,
      eventTitle: payload.eventTitle,
      optionALabel: payload.optionALabel,
      optionBLabel: payload.optionBLabel,
      portfolioBefore: payload.portfolioBefore,
      portfolioAfter: payload.portfolioAfter,
      socialProofPct: payload.socialProofPct,
    });
  }


  private onGameLoopTick(gameLoop: GameLoop): void {
    const phase = gameLoop.getPhase();
    const simState = gameLoop.getState();
    const baseCtx = this.buildCoachContext(gameLoop);

    // Update all terminal windows
    for (const tw of this.terminalWindows.values()) {
      tw.onTick(gameLoop);
    }

    // Show historical news when the GameLoop fires one
    if (gameLoop.historicalNews && gameLoop.historicalNews.name !== this.lastNewsKey) {
      this.lastNewsKey = gameLoop.historicalNews.name;
      this.newsOverlay?.show(gameLoop.historicalNews.name, 5500);
      if (phase === 'simulating' && baseCtx) {
        if (
          gameLoop.historicalNews.type === 'crash' ||
          gameLoop.historicalNews.type === 'shock' ||
          gameLoop.historicalNews.type === 'warning'
        ) {
          this.coach.triggerCoach({
            ...baseCtx,
            trigger: 'market_crash',
            historicalEventName: gameLoop.historicalNews.name,
          });
        } else if (
          gameLoop.historicalNews.type === 'recovery' ||
          gameLoop.historicalNews.type === 'milestone'
        ) {
          this.coach.triggerCoach({
            ...baseCtx,
            trigger: 'market_recovery',
            historicalEventName: gameLoop.historicalNews.name,
          });
        }
      }
    }

    if (
      this.previousPhase === 'idle' &&
      (phase === 'paused' || phase === 'simulating') &&
      baseCtx
    ) {
      this.coach.triggerCoach({
        ...baseCtx,
        trigger: 'game_start',
      });
    }

    if (phase === 'event' && this.previousPhase !== 'event' && gameLoop.activeEvent && baseCtx) {
      this.coach.triggerCoach({
        ...baseCtx,
        trigger: 'life_event_before',
        eventTitle: gameLoop.activeEvent.title,
        eventDescription: gameLoop.activeEvent.description,
        optionALabel: gameLoop.activeEvent.optionA.label,
        optionBLabel: gameLoop.activeEvent.optionB.label,
      });
    }

    if (!this.cashHeavyNotified && phase === 'simulating' && simState && simState.cashHeavyWeeks > 30 && baseCtx) {
      this.cashHeavyNotified = true;
      this.coach.triggerCoach({
        ...baseCtx,
        trigger: 'cash_heavy',
      });
    }

    if (
      !this.milestoneNotified &&
      phase === 'simulating' &&
      simState &&
      this.coachStartingPortfolio > 0 &&
      simState.totalPortfolio > this.coachStartingPortfolio * 3 &&
      baseCtx
    ) {
      this.milestoneNotified = true;
      this.coach.triggerCoach({
        ...baseCtx,
        trigger: 'milestone',
      });
    }

    // Handle phase transitions
    if (phase === 'event' && gameLoop.activeEvent && !this.eventPopupActive) {
      this.showEventPopup();
    } else if (phase === 'results') {
      this.store.dispatch({ type: 'FINISH_GAME' });
    }
    this.previousPhase = phase;
  }

  private showEventPopup(): void {
    if (!this.container || this.eventPopupActive) return;
    this.eventPopupActive = true;
    this.eventPopup = new EventPopup(this.store, this.audio, {
      onEventChoice: (payload) => {
        const engines = (window as unknown as Record<string, unknown>).__gameEngines as
          { gameLoop: GameLoop } | undefined;
        const gameLoop = engines?.gameLoop;
        if (!gameLoop) return;
        this.triggerLifeEventAfterChoice(gameLoop, payload);
      },
    });
    this.eventPopup.show(this.container, () => {
      this.eventPopupActive = false;
      this.eventPopup = null;
    });
  }

  unmount(): void {
    if (this.rebalanceDebounceTimer) {
      clearTimeout(this.rebalanceDebounceTimer);
      this.rebalanceDebounceTimer = null;
    }
    this.tutorialCarousel?.destroy();
    this.tutorialCarousel = null;
    this.eventPopup?.destroy();
    this.eventPopup = null;
    this.eventPopupActive = false;
    this.coachPopup?.destroy();
    this.coachPopup = null;
    this.coach.destroy();
    this.gameLoopUnsub?.();
    this.gameLoopUnsub = null;
    this.newsOverlay?.destroy();
    this.newsOverlay = null;
    this.lastNewsKey = null;

    // Destroy all terminal windows
    for (const tw of this.terminalWindows.values()) {
      tw.destroy();
    }
    this.terminalWindows.clear();
    this.terminalLayer = null;
    this.taskbarEl = null;

    if (this.introVideo) {
      this.introVideo.pause();
      this.introVideo.removeAttribute('src');
      this.introVideo.load();
      this.introVideo = null;
    }
    if (this.loopVideo) {
      this.loopVideo.pause();
      this.loopVideo.removeAttribute('src');
      this.loopVideo.load();
      this.loopVideo = null;
    }
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
    this.allocations.clear();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
