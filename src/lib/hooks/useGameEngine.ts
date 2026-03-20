import { useState, useRef, useCallback, useEffect } from "react";
import {
  SimulationState,
  Seed,
  Asset,
  LifeEventDefinition,
  HistoricalEvent,
  EventChoiceStats,
  PortfolioSnapshot,
  BehavioralProfile,
} from "@/lib/types";
import {
  initSimulation,
  tickSimulation,
  handleRebalance,
  handleEventChoice,
} from "@/lib/engine/simulation";
import { calculateBenchmark } from "@/lib/engine/benchmark";
import { calculateProjection, ProjectionResult } from "@/lib/engine/projection";
import {
  calculateCompositeScore,
  detectBehavioralProfile,
} from "@/lib/engine/scoring";
import { LIFE_EVENTS } from "@/lib/engine/events";

// Speed → milliseconds per tick
const TICK_INTERVALS: Record<number, number> = {
  1: 800, // 1x: one week every 800ms → 10 years in ~7 minutes
  3: 270, // 3x: one week every 270ms → 10 years in ~2.3 minutes
  5: 160, // 5x: one week every 160ms → 10 years in ~1.4 minutes
};

// ── Game phases ──
export type GamePhase =
  | "idle" // before anything starts
  | "loading" // fetching seed data
  | "onboarding" // player picks name, avatar
  | "portfolio" // player builds initial allocation
  | "simulating" // game loop running
  | "paused" // manually paused
  | "event" // life event modal showing
  | "completing" // writing results to API
  | "results"; // game over, showing results

interface GameEngineHook {
  // State
  phase: GamePhase;
  state: SimulationState | null;
  projection: ProjectionResult | null;
  benchmarkFinal: number | null;
  sessionId: string | null;

  // Current event
  activeEvent: LifeEventDefinition | null;
  activeEventStats: EventChoiceStats | null;
  historicalNews: HistoricalEvent | null;

  // Results
  compositeScore: number | null;
  behavioralProfile: BehavioralProfile | null;

  // Derived display values
  currentYear: number;
  currentWeekInYear: number;
  progressPct: number;
  elapsedSeconds: number;

  // Actions
  startGame: (config: {
    playerId: string;
    seed: Seed;
    assets: Asset[];
    prices: Record<string, number[]>;
    startingPortfolio: number;
    monthlyContribution: number;
    allocations: Array<{ assetId: string; pct: number }>;
  }) => Promise<void>;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: 1 | 3 | 5) => void;
  rebalance: (newAllocations: Array<{ assetId: string; pct: number }>) => void;
  chooseEventOption: (chosen: "a" | "b") => Promise<void>;
}

export function useGameEngine(): GameEngineHook {
  // Core state
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [state, setState] = useState<SimulationState | null>(null);
  const [projection, setProjection] = useState<ProjectionResult | null>(null);
  const [benchmarkFinal, setBenchmarkFinal] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Event state
  const [activeEvent, setActiveEvent] = useState<LifeEventDefinition | null>(
    null,
  );
  const [activeEventStats, setActiveEventStats] =
    useState<EventChoiceStats | null>(null);
  const [historicalNews, setHistoricalNews] = useState<HistoricalEvent | null>(
    null,
  );

  // Results
  const [compositeScore, setCompositeScore] = useState<number | null>(null);
  const [behavioralProfile, setBehavioralProfile] =
    useState<BehavioralProfile | null>(null);

  // Timer refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventResumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedRef = useRef<1 | 3 | 5>(3);
  const stateRef = useRef<SimulationState | null>(null);
  const seedRef = useRef<Seed | null>(null);
  const pricesRef = useRef<Record<string, number[]> | null>(null);
  const startTimeRef = useRef<number>(0);
  const benchmarkFinalRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Keep stateRef in sync (so the interval callback always has latest state)
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Derived values ──
  const currentTick = state?.currentTick ?? 0;
  const totalTicks = state?.totalTicks ?? 520;
  const currentYear = Math.floor(currentTick / 52) + 1;
  const currentWeekInYear = (currentTick % 52) + 1;
  const progressPct = totalTicks > 0 ? (currentTick / totalTicks) * 100 : 0;

  // ── Projection updater (called on specific triggers, not every tick) ──
  const updateProjection = useCallback((simState: SimulationState) => {
    if (!pricesRef.current) return;
    const result = calculateProjection({
      currentPortfolio: simState.totalPortfolio,
      positions: simState.positions,
      monthlyContribution: simState.effectiveContribution,
      remainingTicks: simState.totalTicks - simState.currentTick,
      prices: pricesRef.current,
      currentTick: simState.currentTick,
      numPaths: 200,
    });
    setProjection(result);
  }, []);

  // ── Complete game ── (defined before doTick so doTick can reference it)
  const completeGame = useCallback(
    async (finalState: SimulationState) => {
      setPhase("completing");

      const totalContributed =
        finalState.baseContribution * Math.floor(finalState.totalTicks / 4);

      const bFinal = benchmarkFinalRef.current ?? finalState.totalPortfolio;
      const sId = sessionIdRef.current;

      const scoringInput = {
        finalPortfolio: finalState.totalPortfolio,
        startingPortfolio: finalState.positions.reduce(
          (s, p) => s + p.value,
          0,
        ),
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

      const score = calculateCompositeScore(scoringInput);
      const profile = detectBehavioralProfile(scoringInput);
      setCompositeScore(score);
      setBehavioralProfile(profile);

      // Build snapshots from triggered events for API submission
      const snapshots: PortfolioSnapshot[] = finalState.triggeredEvents.map(
        (evt) => ({
          id: "", // server generates
          session_id: sId!,
          week_tick: evt.tick,
          is_initial: false,
          allocations: finalState.positions.map((p) => ({
            assetId: p.assetId,
            pct: p.pct,
            value: p.value,
          })),
          total_value: evt.portfolioAfter,
          trigger: "life_event" as const,
        }),
      );

      // Submit results to API
      if (sId) {
        try {
          await fetch(`/api/sessions/${sId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              finalPortfolio: finalState.totalPortfolio,
              benchmarkFinal: bFinal,
              behavioralProfile: profile,
              compositeScore: score,
              totalRebalances: finalState.totalRebalances,
              panicRebalances: finalState.panicRebalances,
              cashHeavyWeeks: finalState.cashHeavyWeeks,
              maxDrawdownPct: finalState.maxDrawdownPct,
              chainState: finalState.chainState,
              durationSeconds: Math.floor(
                (Date.now() - startTimeRef.current) / 1000,
              ),
              snapshots,
            }),
          });
        } catch (e) {
          console.error("Failed to save results:", e);
        }
      }

      setPhase("results");
    },
    [],
  );

  // ── The tick function (called by setInterval) ──
  const doTick = useCallback(() => {
    const currentState = stateRef.current;
    const seed = seedRef.current;
    if (!currentState || !seed) return;

    const {
      state: newState,
      eventToFire,
      historicalNews: news,
      isComplete,
    } = tickSimulation(currentState, seed);

    setState(newState);

    // Historical news flash (auto-clears after 5 seconds in UI)
    if (news) {
      setHistoricalNews(news);
      if (newsTimeoutRef.current) clearTimeout(newsTimeoutRef.current);
      newsTimeoutRef.current = setTimeout(() => {
        newsTimeoutRef.current = null;
        setHistoricalNews(null);
      }, 5000);
    }

    // Update projection every 4th tick (monthly) for performance
    if (newState.currentTick % 4 === 0) {
      updateProjection(newState);
    }

    // Update elapsed time
    setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));

    // Life event triggered — pause and show modal
    if (eventToFire) {
      // Stop the timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setPhase("event");
      setActiveEvent(eventToFire);

      // Fetch social proof stats (async, non-blocking)
      fetch(`/api/event-stats/${encodeURIComponent(eventToFire.key)}`)
        .then((res) => res.json())
        .then((stats) => setActiveEventStats(stats))
        .catch(() => setActiveEventStats(null));
    }

    // Game complete
    if (isComplete) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      completeGame(newState);
    }
  }, [updateProjection, completeGame]);

  // ── Start timer ──
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const interval = TICK_INTERVALS[speedRef.current] ?? 270;
    timerRef.current = setInterval(doTick, interval);
  }, [doTick]);

  // ── Public actions ──

  const startGame = useCallback(
    async (config: {
      playerId: string;
      seed: Seed;
      assets: Asset[];
      prices: Record<string, number[]>;
      startingPortfolio: number;
      monthlyContribution: number;
      allocations: Array<{ assetId: string; pct: number }>;
    }) => {
      // Create session in API
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: config.playerId,
          seedId: config.seed.id,
          startingPortfolio: config.startingPortfolio,
          monthlyContribution: config.monthlyContribution,
        }),
      });
      const session = await res.json();
      setSessionId(session.id);
      sessionIdRef.current = session.id;

      // Store refs for the tick loop
      seedRef.current = config.seed;
      pricesRef.current = config.prices;

      // Init simulation state
      const simState = initSimulation({
        seed: config.seed,
        assets: config.assets,
        prices: config.prices,
        startingPortfolio: config.startingPortfolio,
        monthlyContribution: config.monthlyContribution,
        allocations: config.allocations,
      });
      setState(simState);

      // Calculate benchmark
      const benchmark = calculateBenchmark({
        prices: config.prices,
        startingPortfolio: config.startingPortfolio,
        monthlyContribution: config.monthlyContribution,
        totalTicks: simState.totalTicks,
        allocations: config.allocations,
      });
      setBenchmarkFinal(benchmark);
      benchmarkFinalRef.current = benchmark;

      // Initial projection
      updateProjection(simState);

      // Start paused — let user click play
      startTimeRef.current = Date.now();
      speedRef.current = 3; // default speed
      setPhase("paused");
    },
    [updateProjection],
  );

  const play = useCallback(() => {
    if (!stateRef.current) return;
    setPhase("simulating");
    startTimer();
  }, [startTimer]);

  const pause = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPhase("paused");
  }, []);

  const setSpeed = useCallback(
    (speed: 1 | 3 | 5) => {
      speedRef.current = speed;
      // If currently playing, restart timer with new interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
        const interval = TICK_INTERVALS[speed] ?? 270;
        timerRef.current = setInterval(doTick, interval);
      }
      // Force a re-render so UI updates the speed buttons
      setState((prev) => (prev ? { ...prev } : null));
    },
    [doTick],
  );

  const rebalance = useCallback(
    (newAllocations: Array<{ assetId: string; pct: number }>) => {
      if (!stateRef.current) return;
      const newState = handleRebalance(stateRef.current, newAllocations);
      setState(newState);
      updateProjection(newState);
    },
    [updateProjection],
  );

  const chooseEventOption = useCallback(
    async (chosen: "a" | "b") => {
      if (!stateRef.current || !activeEvent || !sessionIdRef.current) return;

      const tTicks = stateRef.current.totalTicks;

      // Apply effect to state
      const newState = handleEventChoice(
        stateRef.current,
        activeEvent.key,
        chosen,
        tTicks,
      );
      setState(newState);

      // Record choice in API (fire and forget)
      fetch("/api/event-choices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          eventKey: activeEvent.key,
          chain: activeEvent.chain,
          chosen,
          portfolioAtChoice: stateRef.current.totalPortfolio,
        }),
      }).catch(console.error);

      // Update projection
      updateProjection(newState);

      // Clear event and resume after a short delay
      setActiveEvent(null);
      setActiveEventStats(null);

      // Brief pause to show the effect, then resume
      if (eventResumeTimeoutRef.current) clearTimeout(eventResumeTimeoutRef.current);
      eventResumeTimeoutRef.current = setTimeout(() => {
        eventResumeTimeoutRef.current = null;
        setPhase("simulating");
        startTimer();
      }, 1500);
    },
    [activeEvent, updateProjection, startTimer],
  );

  // ── Cleanup timer on unmount ──
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (eventResumeTimeoutRef.current) clearTimeout(eventResumeTimeoutRef.current);
      if (newsTimeoutRef.current) clearTimeout(newsTimeoutRef.current);
    };
  }, []);

  return {
    phase,
    state,
    projection,
    benchmarkFinal,
    sessionId,
    activeEvent,
    activeEventStats,
    historicalNews,
    compositeScore,
    behavioralProfile,
    currentYear,
    currentWeekInYear,
    progressPct,
    elapsedSeconds,
    startGame,
    play,
    pause,
    setSpeed,
    rebalance,
    chooseEventOption,
  };
}
