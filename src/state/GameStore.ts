import type { GameState, GameAction, ScreenID, EventChoice, MarketCategory, AssetAllocation, SimulationSpeed, AnimationState, CharacterID } from '../types';
import { STARTING_CASH } from '../constants/market';

function createInitialState(): GameState {
  return {
    currentScreen: 'home',
    selectedCharacter: null,
    selectedCategories: [],
    allocations: [],
    startingCash: STARTING_CASH,
    currentCash: STARTING_CASH,
    portfolioValue: STARTING_CASH,
    currentRound: 0,
    totalRounds: 3,
    currentMonth: 0,
    season: 'spring',
    timeOfDay: 'morning',
    currentPhase: 'growth',
    pricePaths: {},
    benchmarkPath: [],
    portfolioHistory: [],
    eventChoices: [],
    aiOpponents: [],
    simulationSpeed: 1,
    isSimulating: false,
    isMuted: false,
    score: null,
    characterAnimation: 'idle',
    // New backend integration fields
    seedData: null,
    playerId: null,
    sessionId: null,
    nickname: '',
    startingPortfolio: STARTING_CASH,
    monthlyContribution: 200,
    gamePhase: 'idle',
    pendingLegacyEvent: false,
  };
}

export class GameStore {
  private state: GameState;
  private listeners: Map<string, Set<() => void>>;

  constructor() {
    this.state = createInitialState();
    this.listeners = new Map();
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  setState(partial: Partial<GameState>): void {
    const changedKeys = Object.keys(partial) as (keyof GameState)[];
    Object.assign(this.state, partial);
    for (const key of changedKeys) {
      this.notify(key);
    }
    this.notify('*');
  }

  subscribe(key: string, callback: () => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  private notify(key: string): void {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      for (const cb of callbacks) {
        cb();
      }
    }
  }

  dispatch(action: GameAction): void {
    switch (action.type) {
      case 'SELECT_CHARACTER':
        this.setState({ selectedCharacter: action.characterId as CharacterID });
        break;

      case 'SELECT_CATEGORIES':
        this.setState({ selectedCategories: action.categories as MarketCategory[] });
        break;

      case 'SET_ALLOCATION':
        this.setState({ allocations: action.allocations as AssetAllocation[] });
        break;

      case 'CONFIRM_TIMESKIP':
        this.setState({ isSimulating: true });
        break;

      case 'RESOLVE_EVENT_CARD': {
        const choices = [...this.state.eventChoices, action.choice as EventChoice];
        this.setState({ eventChoices: choices });
        break;
      }

      case 'SET_SIMULATION_SPEED':
        this.setState({ simulationSpeed: action.speed as SimulationSpeed });
        break;

      case 'ADVANCE_ROUND': {
        const nextRound = this.state.currentRound + 1;
        const phases = ['growth', 'crash', 'recovery'] as const;
        const nextPhase = phases[Math.min(nextRound, phases.length - 1)];
        const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
        const nextSeason = seasons[nextRound % seasons.length];
        this.setState({
          currentRound: nextRound,
          currentPhase: nextPhase,
          season: nextSeason,
          isSimulating: false,
        });
        break;
      }

      case 'FINISH_GAME':
        this.setState({ currentScreen: 'results' as ScreenID });
        break;

      case 'RESTART_GAME':
        this.state = createInitialState();
        this.notify('*');
        for (const key of this.listeners.keys()) {
          this.notify(key);
        }
        break;

      case 'TOGGLE_MUTE':
        this.setState({ isMuted: !this.state.isMuted });
        break;

      case 'SET_SCREEN':
        this.setState({ currentScreen: action.screen as ScreenID });
        break;

      case 'UPDATE_PRICES':
        this.setState({ currentMonth: action.month });
        break;

      case 'SET_ANIMATION':
        this.setState({ characterAnimation: action.animation as AnimationState });
        break;

      case 'SET_PENDING_LEGACY_EVENT':
        this.setState({ pendingLegacyEvent: action.pending });
        break;
    }
  }
}
