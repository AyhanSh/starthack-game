import type {
  LifeEventDefinition,
  ScheduledEvent,
  ChainState,
  SimulationState,
  Seed,
} from '../types';
import { applyLumpSum, moveAllToCash } from './portfolio';

export const LIFE_EVENTS: Record<string, LifeEventDefinition> = {
  'career.opportunity': {
    key: 'career.opportunity',
    chain: 'career',
    title: 'Career Opportunity',
    icon: '💼',
    description:
      'A competitor offers you a 30% salary increase, but you need CHF 5,000 for relocation costs.',
    optionA: {
      label: 'Take the new job',
      hint: 'Portfolio −CHF 5,000, contributions +CHF 150/mo permanently',
      effect: {
        portfolioChange: -5000,
        contributionChange: 150,
        description: 'Sold CHF 5,000 for relocation. Salary increased.',
      },
    },
    optionB: {
      label: 'Stay at current job',
      hint: 'No change',
      effect: {
        description: 'Stayed put. No financial impact.',
      },
    },
  },

  'career.promotion': {
    key: 'career.promotion',
    chain: 'career',
    title: 'Promotion Offer',
    icon: '📈',
    description:
      'You\'re offered a leadership role. Higher salary, but professional development costs CHF 3,000.',
    optionA: {
      label: 'Accept the promotion',
      hint: 'Portfolio −CHF 3,000, contributions +CHF 100/mo permanently',
      effect: {
        portfolioChange: -3000,
        contributionChange: 100,
        description: 'Invested in career growth. Higher salary ahead.',
      },
    },
    optionB: {
      label: 'Decline, stay as individual contributor',
      hint: 'No change',
      effect: {
        description: 'Kept current role. Stable but no salary increase.',
      },
    },
  },

  'career.stagnation': {
    key: 'career.stagnation',
    chain: 'career',
    title: 'Company Downsizing',
    icon: '📉',
    description:
      'Your company is restructuring. You\'re offered a severance package or reduced hours.',
    optionA: {
      label: 'Take severance (CHF 8,000)',
      hint: 'Portfolio +CHF 8,000, contributions −CHF 200/mo for ~1 year',
      effect: {
        portfolioChange: 8000,
        contributionChange: -200,
        contributionDuration: 50,
        description: 'Took severance. Job hunting for a year.',
      },
    },
    optionB: {
      label: 'Accept reduced hours',
      hint: 'Contributions −CHF 100/mo permanently',
      effect: {
        contributionChange: -100,
        description: 'Reduced salary permanently.',
      },
    },
  },

  'personal.housing': {
    key: 'personal.housing',
    chain: 'personal',
    title: 'Property Opportunity',
    icon: '🏠',
    description:
      'You can buy your first apartment. Down payment is CHF 15,000. Rent is rising fast otherwise.',
    optionA: {
      label: 'Buy — use CHF 15,000 from portfolio',
      hint: 'Portfolio −CHF 15,000',
      effect: {
        portfolioChange: -15000,
        description: 'Bought property. Large withdrawal from portfolio.',
      },
    },
    optionB: {
      label: 'Keep renting',
      hint: 'Contributions −CHF 100/mo permanently (rising rent)',
      effect: {
        contributionChange: -100,
        description: 'Rent keeps rising. Less to invest each month.',
      },
    },
  },

  'personal.health': {
    key: 'personal.health',
    chain: 'personal',
    title: 'Medical Emergency',
    icon: '🏥',
    description:
      'An unexpected surgery. Insurance covers most of it, but you owe CHF 6,000 out of pocket.',
    optionA: {
      label: 'Sell investments to pay',
      hint: 'Portfolio −CHF 6,000',
      effect: {
        portfolioChange: -6000,
        description: 'Paid medical bill from portfolio.',
      },
    },
    optionB: {
      label: 'Payment plan',
      hint: 'Contributions −CHF 250/mo for ~6 months',
      effect: {
        contributionChange: -250,
        contributionDuration: 24,
        description: 'Monthly payments for 6 months.',
      },
    },
  },

  'personal.renovation': {
    key: 'personal.renovation',
    chain: 'personal',
    title: 'Home Repair Crisis',
    icon: '🔧',
    description:
      'Your roof needs urgent replacing. The bill is CHF 8,000. This is the reality of property ownership.',
    optionA: {
      label: 'Sell from portfolio',
      hint: 'Portfolio −CHF 8,000',
      effect: {
        portfolioChange: -8000,
        description: 'Another withdrawal. Property costs add up.',
      },
    },
    optionB: {
      label: 'Take a renovation loan',
      hint: 'Contributions −CHF 150/mo for ~10 months',
      effect: {
        contributionChange: -150,
        contributionDuration: 40,
        description: 'Loan payments for 10 months.',
      },
    },
  },

  'crisis.crash_news': {
    key: 'crisis.crash_news',
    chain: 'crisis',
    title: 'Markets in Freefall',
    icon: '📰',
    description:
      'Breaking news: markets have crashed. Headlines predict worse ahead. Social media is full of panic. Your portfolio is bleeding.',
    optionA: {
      label: 'Sell everything — move to cash',
      hint: 'All positions converted to cash immediately',
      effect: {
        moveAllToCash: true,
        description: 'Panic sold. Moved everything to cash.',
      },
    },
    optionB: {
      label: 'Stay the course — ignore the noise',
      hint: 'No change to portfolio',
      effect: {
        description: 'Held steady through the storm.',
      },
    },
  },

  'crisis.windfall': {
    key: 'crisis.windfall',
    chain: 'crisis',
    title: 'Unexpected Inheritance',
    icon: '💰',
    description: 'A relative has left you CHF 10,000. A bittersweet surprise.',
    optionA: {
      label: 'Invest it all',
      hint: 'Portfolio +CHF 10,000 at current allocation',
      effect: {
        portfolioChange: 10000,
        description: 'Added full inheritance to portfolio.',
      },
    },
    optionB: {
      label: 'Invest CHF 5,000, keep CHF 5,000 as cash',
      hint: 'Portfolio +CHF 5,000, Cash +CHF 5,000',
      effect: {
        portfolioChange: 5000,
        description: 'Split inheritance. Half invested, half in cash.',
      },
    },
  },
};

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function scheduleInitialEvents(
  seed: Seed,
  totalTicks: number,
): { events: ScheduledEvent[]; chainState: ChainState } {
  const crashTick =
    seed.crash_weeks && seed.crash_weeks[0] !== undefined &&
    seed.crash_weeks[0] <= totalTicks - 30
      ? seed.crash_weeks[0]
      : randBetween(200, 350);

  const windfall = Math.min(
    randBetween(350, 450),
    totalTicks - 30,
  );

  const raw: ScheduledEvent[] = [
    { chain: 'career', key: 'career.opportunity', tick: randBetween(40, 80) },
    { chain: 'personal', key: 'personal.housing', tick: randBetween(100, 180) },
    { chain: 'personal', key: 'personal.health', tick: randBetween(250, 350) },
    { chain: 'crisis', key: 'crisis.crash_news', tick: crashTick },
    { chain: 'crisis', key: 'crisis.windfall', tick: Math.max(windfall, crashTick + 30) },
  ];

  // Sort, then resolve conflicts until stable
  raw.sort((a, b) => a.tick - b.tick);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].tick - raw[i - 1].tick < 15) {
        raw[i] = { ...raw[i], tick: raw[i - 1].tick + 20 };
        changed = true;
      }
    }
  }

  // Clamp to last-30 boundary
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].tick > totalTicks - 30) {
      raw[i] = { ...raw[i], tick: totalTicks - 30 };
    }
  }

  // Re-resolve conflicts after clamping
  for (let i = raw.length - 2; i >= 0; i--) {
    if (raw[i + 1].tick - raw[i].tick < 15) {
      raw[i] = { ...raw[i], tick: Math.max(1, raw[i + 1].tick - 20) };
    }
  }

  const chainState: ChainState = {
    career: { active: true, tookNewJob: false, promoted: false, stagnated: false },
    personal: { active: true, boughtProperty: false, hadHealthScare: false },
    crisis: { panicSold: false, receivedWindfall: false },
  };

  return { events: raw, chainState };
}

export function scheduleFollowUpEvent(
  eventKey: string,
  chosen: 'a' | 'b',
  currentTick: number,
  totalTicks: number,
): ScheduledEvent | null {
  let followUp: { key: string; chain: ScheduledEvent['chain']; offset: [number, number] } | null = null;

  if (eventKey === 'career.opportunity' && chosen === 'a') {
    followUp = { key: 'career.promotion', chain: 'career', offset: [100, 170] };
  } else if (eventKey === 'career.opportunity' && chosen === 'b') {
    followUp = { key: 'career.stagnation', chain: 'career', offset: [120, 200] };
  } else if (eventKey === 'personal.housing' && chosen === 'a') {
    followUp = { key: 'personal.renovation', chain: 'personal', offset: [150, 250] };
  }

  if (!followUp) return null;

  const tick = Math.min(
    currentTick + randBetween(followUp.offset[0], followUp.offset[1]),
    totalTicks - 30,
  );

  return { chain: followUp.chain, key: followUp.key, tick };
}

export function applyEventEffect(
  state: SimulationState,
  eventKey: string,
  chosen: 'a' | 'b',
): SimulationState {
  const def = LIFE_EVENTS[eventKey];
  if (!def) return state;

  const effect = chosen === 'a' ? def.optionA.effect : def.optionB.effect;
  let positions = [...state.positions];
  let contributionModifiers = [...state.contributionModifiers];
  const chainState: ChainState = {
    career: { ...state.chainState.career },
    personal: { ...state.chainState.personal },
    crisis: { ...state.chainState.crisis },
  };

  // Apply portfolio changes
  if (effect.moveAllToCash) {
    positions = moveAllToCash(positions);
  } else if (effect.portfolioChange !== undefined) {
    if (eventKey === 'crisis.windfall' && chosen === 'b') {
      positions = applyLumpSum(positions, 5000);
      positions = positions.map((pos) =>
        pos.assetId === 'cash'
          ? { ...pos, value: pos.value + 5000 }
          : pos,
      );
    } else {
      positions = applyLumpSum(positions, effect.portfolioChange);
    }
  }

  // Apply contribution modifier
  if (effect.contributionChange !== undefined) {
    const expiresAtTick =
      effect.contributionDuration !== undefined
        ? state.currentTick + effect.contributionDuration
        : null;
    contributionModifiers = [
      ...contributionModifiers,
      {
        reason: def.title,
        amount: effect.contributionChange,
        expiresAtTick,
      },
    ];
  }

  // Update chain state flags
  if (eventKey === 'career.opportunity' && chosen === 'a') {
    chainState.career.tookNewJob = true;
  } else if (eventKey === 'career.promotion' && chosen === 'a') {
    chainState.career.promoted = true;
  } else if (eventKey === 'career.stagnation') {
    chainState.career.stagnated = true;
  } else if (eventKey === 'personal.housing' && chosen === 'a') {
    chainState.personal.boughtProperty = true;
  } else if (eventKey === 'personal.health') {
    chainState.personal.hadHealthScare = true;
  } else if (eventKey === 'crisis.crash_news' && chosen === 'a') {
    chainState.crisis.panicSold = true;
  } else if (eventKey === 'crisis.windfall') {
    chainState.crisis.receivedWindfall = true;
  }

  return {
    ...state,
    positions,
    contributionModifiers,
    chainState,
    totalPortfolio: positions.reduce((s, p) => s + p.value, 0),
  };
}
