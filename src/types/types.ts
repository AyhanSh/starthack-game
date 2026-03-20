// Database row types (match Supabase schema exactly)
export interface Asset {
  id: string;
  name: string;
  asset_class: "equity_index" | "stock" | "bond" | "gold";
  region: "CH" | "EU" | "US" | "global";
  ticker: string | null;
  description: string;
  risk_level: number; // 1-5
}

export interface WeeklyPrice {
  asset_id: string;
  week_index: number;
  date: string; // ISO date
  price: number;
}

export interface Seed {
  id: string;
  name: string;
  start_week: number;
  end_week: number;
  total_weeks: number;
  start_date: string;
  end_date: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  reveal_title: string;
  reveal_text: string;
  historical_events: HistoricalEvent[];
  crash_weeks: number[];
}

export interface HistoricalEvent {
  week: number; // relative to seed start
  name: string;
  type: "crash" | "recovery" | "warning" | "shock" | "milestone";
}

export interface Player {
  id: string;
  device_id: string;
  nickname: string;
  avatar: string;
}

export interface GameSession {
  id: string;
  player_id: string;
  seed_id: string;
  starting_portfolio: number;
  monthly_contribution: number;
  final_portfolio: number | null;
  final_retirement_prob: number | null;
  benchmark_final: number | null;
  behavioral_profile: BehavioralProfile | null;
  composite_score: number | null;
  total_rebalances: number | null;
  panic_rebalances: number | null;
  cash_heavy_weeks: number | null;
  max_drawdown_pct: number | null;
  chain_state: ChainState | null;
  duration_seconds: number | null;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export type BehavioralProfile =
  | "panic_seller"
  | "momentum_chaser"
  | "cash_hoarder"
  | "diamond_hands"
  | "strategist"
  | "overthinker";

export interface PortfolioSnapshot {
  id: string;
  session_id: string;
  week_tick: number;
  is_initial: boolean;
  allocations: AllocationEntry[];
  total_value: number;
  trigger: "initial" | "manual_rebalance" | "life_event";
}

export interface AllocationEntry {
  assetId: string;
  pct: number; // 0-100, all entries sum to 100
  value: number; // CHF amount in this position
}

export interface EventChoice {
  session_id: string;
  event_key: string;
  chain: string;
  chosen: "a" | "b";
  portfolio_at_choice: number;
}

export interface EventChoiceStats {
  event_key: string;
  total_choices: number;
  option_a_count: number;
  option_b_count: number;
  option_a_avg_final_prob: number | null;
  option_b_avg_final_prob: number | null;
}

export interface LeaderboardEntry {
  session_id: string;
  nickname: string;
  avatar: string;
  seed_id: string;
  final_portfolio: number;
  composite_score: number;
  behavioral_profile: BehavioralProfile;
  duration_seconds: number;
  completed_at: string;
}

// ── Game Engine Types (client-side runtime state) ──

export interface PortfolioPosition {
  assetId: string;
  pct: number; // target allocation percentage
  value: number; // current CHF value
  units: number; // "shares" held (value / price at last rebalance)
}

export interface ContributionModifier {
  reason: string;
  amount: number; // positive = increase, negative = decrease
  expiresAtTick: number | null; // null = permanent
}

export interface ChainState {
  career: {
    active: boolean;
    tookNewJob: boolean;
    promoted: boolean;
    stagnated: boolean;
  };
  personal: {
    active: boolean;
    boughtProperty: boolean;
    hadHealthScare: boolean;
  };
  crisis: {
    panicSold: boolean;
    receivedWindfall: boolean;
  };
}

export interface ScheduledEvent {
  chain: "career" | "personal" | "crisis";
  key: string; // e.g. 'career.opportunity'
  tick: number; // when it fires
  dependsOn?: string; // key of prerequisite event
}

export interface LifeEventDefinition {
  key: string;
  chain: "career" | "personal" | "crisis";
  title: string;
  icon: string;
  description: string;
  optionA: {
    label: string;
    hint: string;
    effect: EventEffect;
  };
  optionB: {
    label: string;
    hint: string;
    effect: EventEffect;
  };
}

export interface EventEffect {
  portfolioChange?: number; // lump sum: positive = add, negative = withdraw
  contributionChange?: number; // monthly delta
  contributionDuration?: number; // ticks, null = permanent
  moveAllToCash?: boolean; // for panic sell event
  description: string; // human readable: "Portfolio -CHF 5,000"
}

// ── Simulation State ──

export interface SimulationState {
  // Clock
  currentTick: number;
  totalTicks: number;
  isPlaying: boolean;
  speed: 1 | 3 | 5;

  // Portfolio
  positions: PortfolioPosition[];
  cashValue: number; // cash bucket
  totalPortfolio: number;

  // Contributions
  baseContribution: number;
  contributionModifiers: ContributionModifier[];
  effectiveContribution: number;

  // Analytics
  peakPortfolio: number;
  currentDrawdownPct: number;
  totalRebalances: number;
  panicRebalances: number;
  cashHeavyWeeks: number;
  maxDrawdownPct: number;

  // Events
  chainState: ChainState;
  scheduledEvents: ScheduledEvent[];
  triggeredEvents: TriggeredEvent[];
  activeEvent: LifeEventDefinition | null;

  // Prices (loaded at init, readonly during sim)
  prices: Record<string, number[]>; // assetId → array of prices indexed by tick
}

export interface TriggeredEvent {
  key: string;
  chain: string;
  chosen: "a" | "b";
  tick: number;
  portfolioBefore: number;
  portfolioAfter: number;
}
