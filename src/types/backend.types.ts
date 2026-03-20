// ── Supabase row types (match schema exactly) ──

export interface Asset {
  id: string;
  name: string;
  asset_class: 'equity_index' | 'stock' | 'bond' | 'gold';
  region: 'CH' | 'EU' | 'US' | 'global';
  ticker: string | null;
  description: string;
  risk_level: number; // 1-5
}

export interface WeeklyPrice {
  asset_id: string;
  week_index: number;
  date: string;
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
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  reveal_title: string;
  reveal_text: string;
  historical_events: HistoricalEvent[];
  crash_weeks: number[];
}

export interface HistoricalEvent {
  week: number;
  name: string;
  type: 'crash' | 'recovery' | 'warning' | 'shock' | 'milestone';
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

export interface EventChoiceRecord {
  session_id: string;
  event_key: string;
  chain: string;
  chosen: 'a' | 'b';
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

export interface SeedData {
  seed: Seed;
  assets: Asset[];
  prices: Record<string, number[]>;
  dates: string[];
}

// ── Client-side simulation types ──

export type BehavioralProfile =
  | 'panic_seller'
  | 'momentum_chaser'
  | 'cash_hoarder'
  | 'diamond_hands'
  | 'strategist'
  | 'overthinker';

export type GamePhase =
  | 'idle'
  | 'onboarding'
  | 'portfolio'
  | 'simulating'
  | 'paused'
  | 'event'
  | 'completing'
  | 'results';

export interface PortfolioPosition {
  assetId: string;
  pct: number;
  value: number;
  units: number;
}

export interface ContributionModifier {
  reason: string;
  amount: number;
  expiresAtTick: number | null;
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
  chain: 'career' | 'personal' | 'crisis';
  key: string;
  tick: number;
  dependsOn?: string;
}

export interface LifeEventDefinition {
  key: string;
  chain: 'career' | 'personal' | 'crisis';
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
  portfolioChange?: number;
  contributionChange?: number;
  contributionDuration?: number;
  moveAllToCash?: boolean;
  description: string;
}

export interface TriggeredEvent {
  key: string;
  chain: string;
  chosen: 'a' | 'b';
  tick: number;
  portfolioBefore: number;
  portfolioAfter: number;
}

export interface AllocationEntry {
  assetId: string;
  pct: number;
  value: number;
}

export interface SimulationState {
  // Clock
  currentTick: number;
  totalTicks: number;
  isPlaying: boolean;
  speed: 1 | 3 | 5;

  // Portfolio
  positions: PortfolioPosition[];
  cashValue: number;
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
  prices: Record<string, number[]>;
}

export interface ProjectionResult {
  percentiles: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  medianFinal: number;
  targetProbability: number;
}
