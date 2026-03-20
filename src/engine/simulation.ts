import type {
  SimulationState,
  PortfolioPosition,
  LifeEventDefinition,
  HistoricalEvent,
  Asset,
  Seed,
} from '../types';
import {
  calculateReturns,
  rebalancePortfolio,
  applyContribution,
  getTotalPortfolio,
  getEffectiveContribution,
  clampAllocationsTo100,
} from './portfolio';
import {
  scheduleInitialEvents,
  scheduleFollowUpEvent,
  applyEventEffect,
  LIFE_EVENTS,
} from './events';

// ── Types ──

export interface SimConfig {
  seed: Seed;
  assets: Asset[];
  prices: Record<string, number[]>;
  startingPortfolio: number;
  monthlyContribution: number;
  allocations: Array<{ assetId: string; pct: number }>;
}

export interface TickResult {
  state: SimulationState;
  eventToFire: LifeEventDefinition | null;
  historicalNews: HistoricalEvent | null;
  isComplete: boolean;
}

// ── Synthetic News Generator ──

const SYNTHETIC_NEWS_TEMPLATES = [
  { name: 'Tech sector rallies on AI optimism', type: 'milestone' as const },
  { name: 'Central bank hints at policy shift', type: 'warning' as const },
  { name: 'Emerging markets show strong growth', type: 'recovery' as const },
  { name: 'Inflation data surprises economists', type: 'shock' as const },
  { name: 'Major merger announced in financial sector', type: 'milestone' as const },
  { name: 'Cryptocurrency volatility spikes', type: 'shock' as const },
  { name: 'Housing market shows resilience', type: 'recovery' as const },
  { name: 'Energy prices fluctuate on supply concerns', type: 'warning' as const },
  { name: 'Consumer confidence reaches new high', type: 'milestone' as const },
  { name: 'Trade tensions ease between major economies', type: 'recovery' as const },
  { name: 'Corporate earnings beat expectations', type: 'milestone' as const },
  { name: 'Bond yields shift amid policy speculation', type: 'warning' as const },
];

function generateSyntheticNews(
  week: number,
  currentPortfolio: number,
  peakPortfolio: number,
): HistoricalEvent | null {
  const drawdownPct = ((peakPortfolio - currentPortfolio) / peakPortfolio) * 100;
  
  // Bias news type based on portfolio performance
  let templates = SYNTHETIC_NEWS_TEMPLATES;
  if (drawdownPct > 15) {
    // In drawdown, show more warnings/shocks
    templates = SYNTHETIC_NEWS_TEMPLATES.filter(t => t.type === 'warning' || t.type === 'shock');
  } else if (currentPortfolio > peakPortfolio * 1.05) {
    // Portfolio growing, show more milestones/recovery
    templates = SYNTHETIC_NEWS_TEMPLATES.filter(t => t.type === 'milestone' || t.type === 'recovery');
  }
  
  const template = templates[week % templates.length];
  return {
    week,
    name: template.name,
    type: template.type,
  };
}

// ── Init ──

export function initSimulation(config: SimConfig): SimulationState {
  const { seed, prices, startingPortfolio, monthlyContribution, allocations } = config;
  const totalTicks = seed.total_weeks;

  const normalizedAllocs = clampAllocationsTo100(allocations);
  const positions: PortfolioPosition[] = normalizedAllocs.map((a) => ({
    assetId: a.assetId,
    pct: a.pct,
    value: startingPortfolio * (a.pct / 100),
    units: 0,
  }));

  const { events, chainState } = scheduleInitialEvents(seed, totalTicks);

  return {
    currentTick: 0,
    totalTicks,
    isPlaying: false,
    speed: 1,

    positions,
    cashValue: positions.find((p) => p.assetId === 'cash')?.value ?? 0,
    totalPortfolio: startingPortfolio,

    baseContribution: monthlyContribution,
    contributionModifiers: [],
    effectiveContribution: monthlyContribution,

    peakPortfolio: startingPortfolio,
    currentDrawdownPct: 0,
    totalRebalances: 0,
    panicRebalances: 0,
    cashHeavyWeeks: 0,
    maxDrawdownPct: 0,

    chainState,
    scheduledEvents: events,
    triggeredEvents: [],
    activeEvent: null,

    prices,
  };
}

// ── Tick ──

export function tickSimulation(state: SimulationState, seed: Seed): TickResult {
  const currentTick = state.currentTick + 1;

  // 1. Apply returns
  let positions = calculateReturns(state.positions, state.prices, currentTick);

  // 2. Compute effective contribution
  const effectiveContribution = getEffectiveContribution(
    state.baseContribution,
    state.contributionModifiers,
    currentTick,
  );

  // 3. Monthly contribution (every 4th tick)
  if (currentTick % 4 === 0) {
    positions = applyContribution(positions, effectiveContribution);
  }

  // 4. Recalculate totals
  const totalPortfolio = getTotalPortfolio(positions);
  const cashPos = positions.find((p) => p.assetId === 'cash');
  const cashValue = cashPos?.value ?? 0;

  // 5. Analytics
  const peakPortfolio = Math.max(state.peakPortfolio, totalPortfolio);
  const currentDrawdownPct =
    peakPortfolio > 0
      ? ((peakPortfolio - totalPortfolio) / peakPortfolio) * 100
      : 0;
  const maxDrawdownPct = Math.max(state.maxDrawdownPct, currentDrawdownPct);
  const cashHeavyWeeks =
    state.cashHeavyWeeks + (cashValue > totalPortfolio * 0.5 ? 1 : 0);

  // 6. Expire contribution modifiers
  const contributionModifiers = state.contributionModifiers.filter(
    (m) => m.expiresAtTick === null || currentTick < m.expiresAtTick,
  );

  // 7. Check for scheduled event
  const firedEvent = state.scheduledEvents.find((e) => e.tick === currentTick);
  const eventToFire = firedEvent ? (LIFE_EVENTS[firedEvent.key] ?? null) : null;
  const remainingScheduledEvents = firedEvent
    ? state.scheduledEvents.filter((e) => e !== firedEvent)
    : state.scheduledEvents;

  // 8. Historical news flash (from seed + synthetic)
  let historicalNews =
    seed.historical_events?.find((e) => e.week === currentTick) ?? null;
  
  // Synthetic news roughly every ~20-30 weeks (less frequent, 40% chance each check)
  if (!historicalNews && currentTick > 0 && currentTick % 20 === 0 && Math.random() < 0.4) {
    const syntheticNews = generateSyntheticNews(currentTick, totalPortfolio, peakPortfolio);
    if (syntheticNews) historicalNews = syntheticNews;
  }

  // 9. Completion check
  const isComplete = currentTick >= state.totalTicks;

  const nextState: SimulationState = {
    ...state,
    currentTick,
    positions,
    cashValue,
    totalPortfolio,
    effectiveContribution,
    contributionModifiers,
    scheduledEvents: remainingScheduledEvents,
    peakPortfolio,
    currentDrawdownPct,
    maxDrawdownPct,
    cashHeavyWeeks,
  };

  return { state: nextState, eventToFire, historicalNews, isComplete };
}

// ── Rebalance ──

export function handleRebalance(
  state: SimulationState,
  newAllocations: Array<{ assetId: string; pct: number }>,
): SimulationState {
  const totalValue = getTotalPortfolio(state.positions);
  const normalized = clampAllocationsTo100(newAllocations);
  const newPositions = rebalancePortfolio(totalValue, normalized);

  // Detect panic rebalance
  const safeAssets = new Set(['cash', 'ch_bond', 'bond', 'bonds']);
  const prevSafePct = state.positions
    .filter((p) => safeAssets.has(p.assetId))
    .reduce((s, p) => s + p.pct, 0);
  const newSafePct = normalized
    .filter((a) => safeAssets.has(a.assetId))
    .reduce((s, a) => s + a.pct, 0);
  const isPanic =
    state.currentDrawdownPct > 15 && newSafePct - prevSafePct > 20;

  return {
    ...state,
    positions: newPositions,
    totalPortfolio: getTotalPortfolio(newPositions),
    cashValue: newPositions.find((p) => p.assetId === 'cash')?.value ?? 0,
    totalRebalances: state.totalRebalances + 1,
    panicRebalances: state.panicRebalances + (isPanic ? 1 : 0),
  };
}

// ── Event Choice ──

export function handleEventChoice(
  state: SimulationState,
  eventKey: string,
  chosen: 'a' | 'b',
  totalTicks: number,
): SimulationState {
  const portfolioBefore = state.totalPortfolio;

  // Apply effect
  let next = applyEventEffect(state, eventKey, chosen);
  const portfolioAfter = getTotalPortfolio(next.positions);

  // Record triggered event
  const def = LIFE_EVENTS[eventKey];
  next = {
    ...next,
    triggeredEvents: [
      ...next.triggeredEvents,
      {
        key: eventKey,
        chain: def?.chain ?? '',
        chosen,
        tick: state.currentTick,
        portfolioBefore,
        portfolioAfter,
      },
    ],
  };

  // Schedule follow-up if applicable
  const followUp = scheduleFollowUpEvent(eventKey, chosen, state.currentTick, totalTicks);
  if (followUp) {
    const updatedScheduled = [...next.scheduledEvents, followUp].sort(
      (a, b) => a.tick - b.tick,
    );
    next = { ...next, scheduledEvents: updatedScheduled };
  }

  // Clear active event
  next = { ...next, activeEvent: null };

  return next;
}
