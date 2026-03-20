import type {
  SimulationState,
  Seed,
  Asset,
  LifeEventDefinition,
  HistoricalEvent,
  EventChoiceStats,
  BehavioralProfile,
  ProjectionResult,
  GamePhase,
} from '../types';
import { initSimulation, tickSimulation, handleRebalance, handleEventChoice } from './simulation';
import { calculateBenchmark } from './benchmark';
import { calculateProjection } from './projection';
import { calculateCompositeScore, detectBehavioralProfile } from './scoring';
import type { ScoringInput } from './scoring';
import { GameStore } from '../state/GameStore';
import * as SessionService from '../api/SessionService';
import * as EventService from '../api/EventService';

// Speed → milliseconds per tick
const TICK_INTERVALS: Record<number, number> = {
  1: 800,
  3: 270,
  5: 160,
};

export interface GameLoopConfig {
  playerId: string;
  seed: Seed;
  assets: Asset[];
  prices: Record<string, number[]>;
  startingPortfolio: number;
  monthlyContribution: number;
  allocations: Array<{ assetId: string; pct: number }>;
}

type GameLoopListener = () => void;

/**
 * Vanilla TS replacement for the React `useGameEngine` hook.
 * Manages the tick-based simulation loop, events, scoring, and Supabase persistence.
 */
export class GameLoop {
  private store: GameStore;
  private state: SimulationState | null = null;
  private seed: Seed | null = null;
  private prices: Record<string, number[]> | null = null;
  private phase: GamePhase = 'idle';
  private speed: 1 | 3 | 5 = 3;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private eventResumeHandle: ReturnType<typeof setTimeout> | null = null;
  private newsTimeout: ReturnType<typeof setTimeout> | null = null;
  private startTime: number = 0;
  private sessionId: string | null = null;

  // Exposed state for screens
  public projection: ProjectionResult | null = null;
  public benchmarkFinal: number | null = null;
  public activeEvent: LifeEventDefinition | null = null;
  public activeEventStats: EventChoiceStats | null = null;
  public historicalNews: HistoricalEvent | null = null;
  public compositeScore: number | null = null;
  public behavioralProfile: BehavioralProfile | null = null;
  public elapsedSeconds: number = 0;
  public portfolioHistory: number[] = [];
  public benchmarkHistory: number[] = [];

  private listeners: Set<GameLoopListener> = new Set();

  constructor(store: GameStore) {
    this.store = store;
  }

  // ── Subscription ──

  subscribe(listener: GameLoopListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const cb of this.listeners) cb();
  }

  // ── Getters ──

  getPhase(): GamePhase { return this.phase; }
  getState(): SimulationState | null { return this.state; }
  getSpeed(): 1 | 3 | 5 { return this.speed; }
  getSessionId(): string | null { return this.sessionId; }
  getSeedId(): string | null { return this.seed?.id ?? null; }

  getCurrentYear(): number {
    return Math.floor((this.state?.currentTick ?? 0) / 52) + 1;
  }

  getCurrentWeekInYear(): number {
    return ((this.state?.currentTick ?? 0) % 52) + 1;
  }

  getProgressPct(): number {
    const s = this.state;
    if (!s || s.totalTicks === 0) return 0;
    return (s.currentTick / s.totalTicks) * 100;
  }

  // ── Start Game ──

  async startGame(config: GameLoopConfig): Promise<void> {
    this.seed = config.seed;
    this.prices = config.prices;

    // Create session in Supabase (gracefully handles offline)
    this.sessionId = await SessionService.createSession({
      playerId: config.playerId,
      seedId: config.seed.id,
      startingPortfolio: config.startingPortfolio,
      monthlyContribution: config.monthlyContribution,
    });

    // Initialize simulation
    this.state = initSimulation({
      seed: config.seed,
      assets: config.assets,
      prices: config.prices,
      startingPortfolio: config.startingPortfolio,
      monthlyContribution: config.monthlyContribution,
      allocations: config.allocations,
    });

    // Calculate benchmark
    this.benchmarkFinal = calculateBenchmark({
      prices: config.prices,
      startingPortfolio: config.startingPortfolio,
      monthlyContribution: config.monthlyContribution,
      totalTicks: this.state.totalTicks,
      allocations: config.allocations,
    });

    // Seed portfolio & benchmark history with starting value
    this.portfolioHistory = [config.startingPortfolio];
    this.benchmarkHistory = [config.startingPortfolio];

    // Initial projection
    this.updateProjection();

    // Start paused
    this.startTime = Date.now();
    this.speed = 3;
    this.phase = 'paused';

    // Sync to the GameStore for screen access
    this.syncToStore();
    this.notify();
  }

  // ── Play / Pause / Speed ──

  play(): void {
    if (!this.state) return;
    this.phase = 'simulating';
    this.startTimer();
    this.syncToStore();
    this.notify();
  }

  pause(): void {
    this.stopTimer();
    this.phase = 'paused';
    this.syncToStore();
    this.notify();
  }

  setSpeed(speed: 1 | 3 | 5): void {
    this.speed = speed;
    if (this.timerHandle) {
      this.stopTimer();
      this.startTimer();
    }
    this.notify();
  }

  // ── Rebalance ──

  rebalance(newAllocations: Array<{ assetId: string; pct: number }>): void {
    if (!this.state) return;
    this.state = handleRebalance(this.state, newAllocations);
    this.updateProjection();
    this.syncToStore();
    this.notify();
  }

  // ── Skip Year ──

  skipYear(): void {
    if (!this.state || !this.seed) return;
    
    const wasPaused = this.phase === 'paused';
    this.pause();

    // Skip 52 ticks (1 year)
    for (let i = 0; i < 52; i++) {
      if (!this.state) break;
      
      const { state: newState, eventToFire, historicalNews, isComplete } =
        tickSimulation(this.state, this.seed);
      
      this.state = newState;

      // Record portfolio & benchmark history
      this.portfolioHistory.push(newState.totalPortfolio);
      this.pushBenchmarkTick(newState.currentTick);

      // If an event fires, stop skipping and show it
      if (eventToFire) {
        this.phase = 'event';
        this.activeEvent = eventToFire;
        EventService.fetchEventStats(eventToFire.key)
          .then((stats) => {
            this.activeEventStats = stats;
            this.notify();
          })
          .catch(() => {
            this.activeEventStats = null;
            this.notify();
          });
        this.updateProjection();
        this.syncToStore();
        this.notify();
        return;
      }

      if (isComplete) {
        this.completeGame(newState);
        return;
      }
    }

    this.updateProjection();
    this.syncToStore();
    this.notify();

    if (!wasPaused) {
      this.play();
    }
  }

  // ── Event Choice ──

  async chooseEventOption(chosen: 'a' | 'b'): Promise<void> {
    if (!this.state || !this.activeEvent) return;

    const eventKey = this.activeEvent.key;
    const chain = this.activeEvent.chain;
    const portfolioAtChoice = this.state.totalPortfolio;

    // Apply effect
    this.state = handleEventChoice(
      this.state,
      eventKey,
      chosen,
      this.state.totalTicks,
    );

    // Record choice (fire-and-forget)
    if (this.sessionId) {
      EventService.recordEventChoice(
        this.sessionId,
        eventKey,
        chain,
        chosen,
        portfolioAtChoice,
      );
    }

    // Update projection
    this.updateProjection();

    // Clear event
    this.activeEvent = null;
    this.activeEventStats = null;

    // Resume after delay
    this.syncToStore();
    this.notify();

    if (this.eventResumeHandle) clearTimeout(this.eventResumeHandle);
    this.eventResumeHandle = setTimeout(() => {
      this.eventResumeHandle = null;
      this.phase = 'simulating';
      this.startTimer();
      this.syncToStore();
      this.notify();
    }, 1500);
  }

  // ── Internal: Timer ──

  private startTimer(): void {
    this.stopTimer();
    const interval = TICK_INTERVALS[this.speed] ?? 270;
    this.timerHandle = setInterval(() => this.doTick(), interval);
  }

  private stopTimer(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  // ── Internal: Tick ──

  private doTick(): void {
    if (!this.state || !this.seed) return;

    const { state: newState, eventToFire, historicalNews, isComplete } =
      tickSimulation(this.state, this.seed);

    this.state = newState;

    // Record portfolio & benchmark history
    this.portfolioHistory.push(newState.totalPortfolio);
    this.pushBenchmarkTick(newState.currentTick);

    // Historical news flash
    if (historicalNews) {
      this.historicalNews = historicalNews;
      if (this.newsTimeout) clearTimeout(this.newsTimeout);
      this.newsTimeout = setTimeout(() => {
        this.historicalNews = null;
        this.newsTimeout = null;
        this.notify();
      }, 5000);
    }

    // Update projection every 4th tick
    if (newState.currentTick % 4 === 0) {
      this.updateProjection();
    }

    // Update elapsed
    this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    // Life event
    if (eventToFire) {
      this.stopTimer();
      this.phase = 'event';
      this.activeEvent = eventToFire;

      // Fetch social proof (async)
      EventService.fetchEventStats(eventToFire.key)
        .then((stats) => {
          this.activeEventStats = stats;
          this.notify();
        });
    }

    // Game complete
    if (isComplete) {
      this.stopTimer();
      this.completeGame(newState);
      return;
    }

    this.syncToStore();
    this.notify();
  }

  // ── Internal: Complete Game ──

  private async completeGame(finalState: SimulationState): Promise<void> {
    this.phase = 'completing';
    this.syncToStore();
    this.notify();

    const totalContributed =
      finalState.baseContribution * Math.floor(finalState.totalTicks / 4);

    const bFinal = this.benchmarkFinal ?? finalState.totalPortfolio;

    const scoringInput: ScoringInput = {
      finalPortfolio: finalState.totalPortfolio,
      startingPortfolio: finalState.positions.reduce((s, p) => s + p.value, 0),
      totalContributed,
      benchmarkFinal: bFinal,
      totalRebalances: finalState.totalRebalances,
      panicRebalances: finalState.panicRebalances,
      cashHeavyWeeks: finalState.cashHeavyWeeks,
      totalWeeks: finalState.totalTicks,
      maxDrawdownPct: finalState.maxDrawdownPct,
      chainState: finalState.chainState,
      triggeredEvents: finalState.triggeredEvents,
    };

    this.compositeScore = calculateCompositeScore(scoringInput);
    this.behavioralProfile = detectBehavioralProfile(scoringInput);

    // Submit results to Supabase
    if (this.sessionId) {
      SessionService.completeSession(this.sessionId, {
        finalPortfolio: finalState.totalPortfolio,
        benchmarkFinal: bFinal,
        behavioralProfile: this.behavioralProfile,
        compositeScore: this.compositeScore,
        totalRebalances: finalState.totalRebalances,
        panicRebalances: finalState.panicRebalances,
        cashHeavyWeeks: finalState.cashHeavyWeeks,
        maxDrawdownPct: finalState.maxDrawdownPct,
        chainState: finalState.chainState,
        durationSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      }).catch(console.error);
    }

    this.phase = 'results';
    this.syncToStore();
    this.notify();
  }

  // ── Internal: Projection ──

  private updateProjection(): void {
    if (!this.state || !this.prices) return;
    this.projection = calculateProjection({
      currentPortfolio: this.state.totalPortfolio,
      positions: this.state.positions,
      monthlyContribution: this.state.effectiveContribution,
      remainingTicks: this.state.totalTicks - this.state.currentTick,
      prices: this.prices,
      currentTick: this.state.currentTick,
      numPaths: 200,
    });
  }

  // ── Internal: Sync state to legacy GameStore for screen compatibility ──

  private syncToStore(): void {
    if (!this.state) return;
    this.store.setState({
      portfolioValue: this.state.totalPortfolio,
      currentCash: this.state.cashValue,
      currentMonth: this.state.currentTick,
      isSimulating: this.phase === 'simulating',
    });
  }

  // ── Benchmark history helper ──

  private pushBenchmarkTick(tick: number): void {
    if (!this.prices || !this.state) return;
    const benchAssets = Object.keys(this.prices);
    if (benchAssets.length === 0) return;
    const startVal = this.portfolioHistory[0] ?? this.state.totalPortfolio;
    const equalWeight = 1 / benchAssets.length;
    let benchVal = 0;
    for (const assetId of benchAssets) {
      const path = this.prices[assetId];
      if (!path || path.length === 0) continue;
      const startPrice = path[0];
      const curPrice = path[Math.min(tick, path.length - 1)];
      if (startPrice > 0) {
        benchVal += startVal * equalWeight * (curPrice / startPrice);
      }
    }
    this.benchmarkHistory.push(benchVal > 0 ? benchVal : startVal);
  }

  // ── Cleanup ──

  destroy(): void {
    this.stopTimer();
    if (this.eventResumeHandle) clearTimeout(this.eventResumeHandle);
    if (this.newsTimeout) clearTimeout(this.newsTimeout);
    this.listeners.clear();
  }
}
