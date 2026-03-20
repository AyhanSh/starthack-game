import type {
  BehavioralProfile,
  ChainState,
  TriggeredEvent,
} from '../types';

export interface ScoringInput {
  finalPortfolio: number;
  startingPortfolio: number;
  totalContributed: number;
  benchmarkFinal: number;
  totalRebalances: number;
  panicRebalances: number;
  cashHeavyWeeks: number;
  totalWeeks: number;
  maxDrawdownPct: number;
  chainState: ChainState;
  triggeredEvents: TriggeredEvent[];
}

export function calculateCompositeScore(input: ScoringInput): number {
  const {
    finalPortfolio,
    benchmarkFinal,
    totalRebalances,
    panicRebalances,
    cashHeavyWeeks,
    totalWeeks,
    triggeredEvents,
  } = input;

  // Portfolio score (0–100)
  const ratio = benchmarkFinal > 0 ? finalPortfolio / benchmarkFinal : 0;
  const portfolioScore = Math.min(ratio * 80, 100);

  // Discipline score (0–100)
  let disciplineScore = 100;
  disciplineScore -= panicRebalances * 15;
  disciplineScore -= (cashHeavyWeeks / totalWeeks) * 30;
  disciplineScore -= Math.max(0, totalRebalances - 5) * 3;
  disciplineScore = Math.max(0, disciplineScore);

  // Event score (0–100)
  let eventRaw = 0;
  const maxPossible =
    triggeredEvents.length > 0 ? triggeredEvents.length * 25 : 1;

  for (const ev of triggeredEvents) {
    if (ev.key === 'crisis.crash_news') {
      eventRaw += ev.chosen === 'b' ? 25 : 0;
    } else if (ev.key === 'career.opportunity' && ev.chosen === 'a') {
      eventRaw += 15;
    } else if (ev.key === 'crisis.windfall' && ev.chosen === 'a') {
      eventRaw += 10;
    } else {
      eventRaw += 5;
    }
  }

  const eventScore =
    triggeredEvents.length === 0
      ? 50
      : Math.min((eventRaw / maxPossible) * 100, 100);

  const composite =
    portfolioScore * 0.4 + disciplineScore * 0.35 + eventScore * 0.25;

  return Math.round(composite * 100) / 100;
}

export function detectBehavioralProfile(
  input: ScoringInput,
): BehavioralProfile {
  const {
    panicRebalances,
    chainState,
    cashHeavyWeeks,
    totalWeeks,
    totalRebalances,
    finalPortfolio,
    benchmarkFinal,
  } = input;

  if (panicRebalances >= 1 && chainState.crisis.panicSold) {
    return 'panic_seller';
  }
  if (cashHeavyWeeks >= totalWeeks * 0.3) {
    return 'cash_hoarder';
  }
  if (totalRebalances >= 8) {
    return 'overthinker';
  }
  if (finalPortfolio > benchmarkFinal && panicRebalances === 0) {
    return 'strategist';
  }
  if (totalRebalances <= 2 && cashHeavyWeeks < totalWeeks * 0.1) {
    return 'diamond_hands';
  }
  return 'momentum_chaser';
}

export function getProfileDisplay(
  profile: BehavioralProfile,
  input?: Partial<ScoringInput>,
): {
  name: string;
  icon: string;
  description: string;
} {
  const cashWeeks = input?.cashHeavyWeeks ?? 0;
  const benchmarkDiff =
    input?.finalPortfolio !== undefined && input?.benchmarkFinal !== undefined
      ? Math.round(input.finalPortfolio - input.benchmarkFinal)
      : 0;
  const rebalances = input?.totalRebalances ?? 0;

  const map: Record<
    BehavioralProfile,
    { name: string; icon: string; description: string }
  > = {
    panic_seller: {
      name: 'The Panic Seller',
      icon: '🔴',
      description:
        'Fear drove your biggest decisions. You sold during the crash and shifted to safety during drawdowns.',
    },
    cash_hoarder: {
      name: 'The Cash Hoarder',
      icon: '🏦',
      description: `You kept a huge cash position for ${cashWeeks} weeks. Cash feels safe, but inflation eats it alive.`,
    },
    overthinker: {
      name: 'The Overthinker',
      icon: '🔄',
      description: `You made ${rebalances} changes. Every move felt logical, but the friction cost you.`,
    },
    strategist: {
      name: 'The Strategist',
      icon: '🎯',
      description: `You beat the benchmark by CHF ${Math.abs(benchmarkDiff).toLocaleString()}. Rare skill — or lucky timing?`,
    },
    diamond_hands: {
      name: 'Diamond Hands',
      icon: '💎',
      description:
        'You barely touched your portfolio through crashes, panics, and headlines. Boring? Yes. Effective? Absolutely.',
    },
    momentum_chaser: {
      name: 'The Active Investor',
      icon: '📊',
      description: 'You stayed engaged and made adjustments along the way.',
    },
  };

  return map[profile];
}
