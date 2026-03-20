import type {
  MultiplayerState,
  MultiplayerPhase,
  OpponentInfo,
  DecisionWindow,
  MatchEventOutcome,
  MatchResult,
  MatchRules,
  MatchPlayerSlot,
  MatchRow,
  MatchPlayerRow,
  MatchEventOutcomeRow,
  MatchEventMoveRow,
  EventTimelineEntry,
} from '../types/multiplayer.types';

// ── Actions ────────────────────────────────────────────────────────────────

export type MultiplayerAction =
  | { type: 'SET_PHASE'; phase: MultiplayerPhase }
  | { type: 'MATCH_CREATED'; matchId: string; joinCode: string; mySlot: MatchPlayerSlot; rules: MatchRules }
  | { type: 'MATCH_JOINED'; matchId: string; joinCode: string; mySlot: MatchPlayerSlot; rules: MatchRules }
  | { type: 'OPPONENT_JOINED'; opponent: OpponentInfo }
  | { type: 'OPPONENT_READY' }
  | { type: 'OPPONENT_STATUS_UPDATED'; opponent: OpponentInfo }
  | { type: 'COUNTDOWN_TICK'; secondsLeft: number }
  | { type: 'GAME_STARTED'; serverStartTs: number }
  | { type: 'OPEN_DECISION_WINDOW'; window: DecisionWindow }
  | { type: 'CLOSE_DECISION_WINDOW' }
  | { type: 'EVENT_OUTCOME_RECEIVED'; outcome: MatchEventOutcome; mySlot: MatchPlayerSlot }
  | { type: 'CLEAR_PENDING_OUTCOME' }
  | { type: 'MY_DECISION_SCORE_UPDATED'; score: number }
  | { type: 'SPEND_READ_TOKEN' }
  | { type: 'MATCH_FINISHED'; result: MatchResult }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

// ── Valid phase transitions ────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<MultiplayerPhase, MultiplayerPhase[]> = {
  'multiplayer-config':    ['multiplayer-waiting'],
  'multiplayer-waiting':   ['multiplayer-countdown', 'multiplayer-config'],
  'multiplayer-countdown': ['multiplayer-playing'],
  'multiplayer-playing':   ['multiplayer-results'],
  'multiplayer-results':   ['multiplayer-config'],
};

function canTransition(from: MultiplayerPhase, to: MultiplayerPhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Initial state ──────────────────────────────────────────────────────────

function createInitialState(): MultiplayerState {
  return {
    phase: 'multiplayer-config',
    matchId: null,
    joinCode: null,
    mySlot: null,
    rules: null,
    opponent: null,
    countdownSecondsLeft: 3,
    serverStartTs: null,
    activeEventKey: null,
    activeDecisionWindow: null,
    pendingOutcome: null,
    myDecisionScore: 0,
    myReadTokensLeft: 2,
    matchResult: null,
    error: null,
  };
}

// ── Reducer ────────────────────────────────────────────────────────────────

function reducer(state: MultiplayerState, action: MultiplayerAction): MultiplayerState {
  switch (action.type) {
    case 'SET_PHASE': {
      if (!canTransition(state.phase, action.phase)) {
        console.warn(`[MultiplayerStore] Invalid transition: ${state.phase} → ${action.phase}`);
        return state;
      }
      return { ...state, phase: action.phase, error: null };
    }

    case 'MATCH_CREATED':
    case 'MATCH_JOINED':
      return {
        ...state,
        matchId: action.matchId,
        joinCode: action.joinCode,
        mySlot: action.mySlot,
        rules: action.rules,
        phase: 'multiplayer-waiting',
        error: null,
      };

    case 'OPPONENT_JOINED':
    case 'OPPONENT_STATUS_UPDATED':
      return { ...state, opponent: action.opponent };

    case 'OPPONENT_READY':
      if (!state.opponent) return state;
      return { ...state, opponent: { ...state.opponent, status: 'ready' } };

    case 'COUNTDOWN_TICK':
      return { ...state, countdownSecondsLeft: action.secondsLeft };

    case 'GAME_STARTED':
      return {
        ...state,
        phase: 'multiplayer-playing',
        serverStartTs: action.serverStartTs,
        error: null,
      };

    case 'OPEN_DECISION_WINDOW':
      return {
        ...state,
        activeEventKey: action.window.eventKey,
        activeDecisionWindow: action.window,
      };

    case 'CLOSE_DECISION_WINDOW':
      return {
        ...state,
        activeDecisionWindow: null,
        // keep activeEventKey until outcome resolves
      };

    case 'EVENT_OUTCOME_RECEIVED': {
      const { outcome, mySlot } = action;
      const myEdge = mySlot === 'A' ? outcome.slot_a_edge : outcome.slot_b_edge;
      const opponentEdge = mySlot === 'A' ? outcome.slot_b_edge : outcome.slot_a_edge;
      const myOutread = mySlot === 'A' ? outcome.slot_a_outread : outcome.slot_b_outread;
      const opponentOutread = mySlot === 'A' ? outcome.slot_b_outread : outcome.slot_a_outread;
      const myBluff = mySlot === 'A' ? outcome.slot_a_bluff_success : outcome.slot_b_bluff_success;
      const opponentBluff = mySlot === 'A' ? outcome.slot_b_bluff_success : outcome.slot_a_bluff_success;
      return {
        ...state,
        pendingOutcome: {
          ...outcome,
          slot_a_edge: myEdge,
          slot_b_edge: opponentEdge,
          slot_a_outread: myOutread,
          slot_b_outread: opponentOutread,
          slot_a_bluff_success: myBluff,
          slot_b_bluff_success: opponentBluff,
        },
        myDecisionScore: state.myDecisionScore + myEdge,
        activeEventKey: null,
      };
    }

    case 'CLEAR_PENDING_OUTCOME':
      return { ...state, pendingOutcome: null };

    case 'MY_DECISION_SCORE_UPDATED':
      return { ...state, myDecisionScore: action.score };

    case 'SPEND_READ_TOKEN':
      return { ...state, myReadTokensLeft: Math.max(0, state.myReadTokensLeft - 1) };

    case 'MATCH_FINISHED':
      return {
        ...state,
        phase: 'multiplayer-results',
        matchResult: action.result,
        error: null,
      };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

// ── Store class ────────────────────────────────────────────────────────────

type Listener = () => void;

export class MultiplayerStore {
  private state: MultiplayerState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = createInitialState();
  }

  getState(): Readonly<MultiplayerState> {
    return this.state;
  }

  dispatch(action: MultiplayerAction): void {
    const next = reducer(this.state, action);
    if (next !== this.state) {
      this.state = next;
      this.notify();
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const cb of this.listeners) cb();
  }

  // ── Convenience helpers ──────────────────────────────────────────────────

  /** Derive MatchResult from completed DB rows. */
  buildMatchResult(
    mySlot: MatchPlayerSlot,
    myPlayer: MatchPlayerRow,
    opponentPlayer: MatchPlayerRow,
    outcomes: MatchEventOutcomeRow[],
    allMoves: MatchEventMoveRow[],
  ): MatchResult {
    const PORTFOLIO_WEIGHT = 0.65;
    const DECISION_WEIGHT = 0.35;

    const myPortfolio = myPlayer.final_portfolio ?? 0;
    const opPortfolio = opponentPlayer.final_portfolio ?? 0;
    const myComposite = myPlayer.composite_score ?? 0;
    const opComposite = opponentPlayer.composite_score ?? 0;
    const myDecision = myPlayer.decision_score;
    const opDecision = opponentPlayer.decision_score;

    // Normalise decision score to 0-100
    const maxDecision = Math.max(myDecision, opDecision, 1);
    const myDecisionNorm = Math.min((myDecision / maxDecision) * 100, 100);
    const opDecisionNorm = Math.min((opDecision / maxDecision) * 100, 100);

    const myFinalScore = PORTFOLIO_WEIGHT * myComposite + DECISION_WEIGHT * myDecisionNorm;
    const opFinalScore = PORTFOLIO_WEIGHT * opComposite + DECISION_WEIGHT * opDecisionNorm;

    let winner: 'A' | 'B' | 'draw';
    if (Math.abs(myFinalScore - opFinalScore) < 0.5) {
      winner = 'draw';
    } else if (mySlot === 'A') {
      winner = myFinalScore > opFinalScore ? 'A' : 'B';
    } else {
      winner = opFinalScore > myFinalScore ? 'A' : 'B';
    }

    // Build event timeline
    const eventTimeline: EventTimelineEntry[] = outcomes.map((o) => {
      const moveA = allMoves.find((m) => m.event_key === o.event_key && m.slot === 'A');
      const moveB = allMoves.find((m) => m.event_key === o.event_key && m.slot === 'B');
      const myMove = mySlot === 'A' ? moveA : moveB;
      const opMove = mySlot === 'A' ? moveB : moveA;
      return {
        eventKey: o.event_key,
        myChoice: (myMove?.public_choice ?? 'a') as 'a' | 'b',
        opponentChoice: (opMove?.public_choice ?? 'a') as 'a' | 'b',
        myIntent: (myMove?.hidden_intent ?? 'neutral') as import('../types/multiplayer.types').HiddenIntent,
        opponentIntent: (opMove?.hidden_intent ?? 'neutral') as import('../types/multiplayer.types').HiddenIntent,
        myEdge: mySlot === 'A' ? o.slot_a_edge : o.slot_b_edge,
        opponentEdge: mySlot === 'A' ? o.slot_b_edge : o.slot_a_edge,
        myOutread: mySlot === 'A' ? o.slot_a_outread : o.slot_b_outread,
        opponentOutread: mySlot === 'A' ? o.slot_b_outread : o.slot_a_outread,
      };
    });

    return {
      winner,
      mySlot,
      myFinalPortfolio: myPortfolio,
      opponentFinalPortfolio: opPortfolio,
      myCompositeScore: myComposite,
      opponentCompositeScore: opComposite,
      myDecisionScore: myDecision,
      opponentDecisionScore: opDecision,
      myFinalMatchScore: myFinalScore,
      opponentFinalMatchScore: opFinalScore,
      eventTimeline,
    };
  }
}
