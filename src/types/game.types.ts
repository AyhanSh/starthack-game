import type { CharacterID, AnimationState } from './character.types';
import type { MarketCategory, AssetAllocation, PricePoint, PortfolioSnapshot, MarketPhase } from './market.types';
import type { SeedData, GamePhase as SimGamePhase } from './backend.types';

export type ScreenID =
  | 'home'
  | 'character-select'
  | 'market-select'
  | 'trading'
  | 'timeskip'
  | 'results'
  | 'multiplayer-arena'
  | 'leaderboard';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type TimeOfDay = 'morning' | 'afternoon' | 'dusk' | 'night';

export type EventChoice =
  | 'hold'
  | 'take-profits'
  | 'sell-everything'
  | 'buy-more';

export type SimulationSpeed = 1 | 2 | 4;

export interface EventCardData {
  title: string;
  subtitle: string;
  body: string;
  impactSummary: string;
  choices: EventChoiceOption[];
  characterEmotion: AnimationState;
  phase: MarketPhase;
}

export interface EventChoiceOption {
  label: string;
  action: EventChoice;
  description: string;
}

export interface ScoreBreakdown {
  diversification: number;
  riskAlignment: number;
  crashBehaviour: number;
  returnVsBenchmark: number;
  total: number;
  verdict: string;
}

export interface AIOpponentState {
  id: string;
  name: string;
  allocation: AssetAllocation[];
  crashBehaviour: EventChoice;
  finalValue: number;
  score: ScoreBreakdown;
}

export interface GameState {
  currentScreen: ScreenID;
  selectedCharacter: CharacterID | null;
  selectedCategories: MarketCategory[];
  allocations: AssetAllocation[];
  startingCash: number;
  currentCash: number;
  portfolioValue: number;
  currentRound: number;
  totalRounds: number;
  currentMonth: number;
  season: Season;
  timeOfDay: TimeOfDay;
  currentPhase: MarketPhase;
  pricePaths: Record<string, PricePoint[]>;
  benchmarkPath: PricePoint[];
  portfolioHistory: PortfolioSnapshot[];
  eventChoices: EventChoice[];
  aiOpponents: AIOpponentState[];
  simulationSpeed: SimulationSpeed;
  isSimulating: boolean;
  isMuted: boolean;
  score: ScoreBreakdown | null;
  characterAnimation: AnimationState;
  // ── New fields from backend integration ──
  seedData: SeedData | null;
  playerId: string | null;
  sessionId: string | null;
  nickname: string;
  startingPortfolio: number;
  monthlyContribution: number;
  gamePhase: SimGamePhase;
  pendingLegacyEvent: boolean;
}

export type GameAction =
  | { type: 'SELECT_CHARACTER'; characterId: CharacterID }
  | { type: 'SELECT_CATEGORIES'; categories: MarketCategory[] }
  | { type: 'SET_ALLOCATION'; allocations: AssetAllocation[] }
  | { type: 'CONFIRM_TIMESKIP' }
  | { type: 'RESOLVE_EVENT_CARD'; choice: EventChoice }
  | { type: 'SET_SIMULATION_SPEED'; speed: SimulationSpeed }
  | { type: 'ADVANCE_ROUND' }
  | { type: 'FINISH_GAME' }
  | { type: 'RESTART_GAME' }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SET_SCREEN'; screen: ScreenID }
  | { type: 'UPDATE_PRICES'; month: number }
  | { type: 'SET_ANIMATION'; animation: AnimationState }
  | { type: 'SET_PENDING_LEGACY_EVENT'; pending: boolean };
