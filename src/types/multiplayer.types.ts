// ── Match lifecycle ──────────────────────────────────────────────────────────

export type MatchStatus =
  | 'waiting_for_opponent'
  | 'both_joined'
  | 'countdown'
  | 'in_progress'
  | 'finished'
  | 'abandoned';

export type MatchRules = {
  seedId: string;
  startingPortfolio: number;
  monthlyContribution: number;
  /** Max seconds a player can take on a decision window (default 60) */
  decisionTimeoutSeconds: number;
  /** Seconds of countdown before game starts (default 3) */
  countdownSeconds: number;
};

export interface Match {
  id: string;
  join_code: string;
  status: MatchStatus;
  rules: MatchRules;
  server_start_ts: string | null;    // ISO timestamp when countdown finished
  created_at: string;
  finished_at: string | null;
}

// ── Match players ─────────────────────────────────────────────────────────────

export type MatchPlayerSlot = 'A' | 'B';
export type MatchPlayerStatus = 'joined' | 'ready' | 'playing' | 'finished' | 'disconnected';

export interface MatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  slot: MatchPlayerSlot;
  session_id: string | null;
  status: MatchPlayerStatus;
  read_tokens_remaining: number;    // default 2
  decision_score: number;           // accumulated DecisionScore
  final_portfolio: number | null;
  composite_score: number | null;
  joined_at: string;
  finished_at: string | null;
}

// ── Event moves ───────────────────────────────────────────────────────────────

export type HiddenIntent = 'defensive' | 'neutral' | 'aggressive';
export type BluffAction = 'none' | 'bluff' | 'call_bluff';

export interface MatchEventMove {
  id: string;
  match_id: string;
  event_key: string;
  player_id: string;
  slot: MatchPlayerSlot;
  public_choice: 'a' | 'b';
  hidden_intent: HiddenIntent;
  used_read_token: boolean;
  bluff_action: BluffAction;
  submitted_at: string;
}

// ── Event outcomes (resolved after both submit or timeout) ────────────────────

export interface MatchEventOutcome {
  id: string;
  match_id: string;
  event_key: string;
  slot_a_edge: number;              // delta decision score for slot A
  slot_b_edge: number;              // delta decision score for slot B
  slot_a_outread: boolean | null;   // null if no read token used
  slot_b_outread: boolean | null;
  slot_a_bluff_success: boolean | null;
  slot_b_bluff_success: boolean | null;
  resolved_at: string;
}

// ── Client-side multiplayer state machine ─────────────────────────────────────

export type MultiplayerPhase =
  | 'multiplayer-config'
  | 'multiplayer-waiting'
  | 'multiplayer-countdown'
  | 'multiplayer-playing'
  | 'multiplayer-results';

export interface OpponentInfo {
  playerId: string;
  nickname: string;
  avatar: string;
  slot: MatchPlayerSlot;
  status: MatchPlayerStatus;
  decisionScore: number;
  finalPortfolio: number | null;
  compositeScore: number | null;
}

export interface MultiplayerState {
  phase: MultiplayerPhase;
  matchId: string | null;
  joinCode: string | null;
  mySlot: MatchPlayerSlot | null;
  rules: MatchRules | null;
  opponent: OpponentInfo | null;
  countdownSecondsLeft: number;
  serverStartTs: number | null;           // epoch ms from server
  activeEventKey: string | null;
  activeDecisionWindow: DecisionWindow | null;
  pendingOutcome: MatchEventOutcome | null;
  myDecisionScore: number;
  myReadTokensLeft: number;
  matchResult: MatchResult | null;
  error: string | null;
}

// ── Decision window (active event needing mind-game input) ────────────────────

export interface DecisionWindow {
  eventKey: string;
  publicChoiceRequired: boolean;
  intentRequired: boolean;
  readTokenAvailable: boolean;
  bluffAvailable: boolean;
  expiresAt: number;                // epoch ms
}

export interface DecisionSubmission {
  publicChoice: 'a' | 'b';
  hiddenIntent: HiddenIntent;
  useReadToken: boolean;
  bluffAction: BluffAction;
}

// ── Match result ──────────────────────────────────────────────────────────────

export type MatchWinner = 'A' | 'B' | 'draw';

export interface MatchResult {
  winner: MatchWinner;
  mySlot: MatchPlayerSlot;

  myFinalPortfolio: number;
  opponentFinalPortfolio: number;

  myCompositeScore: number;
  opponentCompositeScore: number;

  myDecisionScore: number;
  opponentDecisionScore: number;

  myFinalMatchScore: number;
  opponentFinalMatchScore: number;

  eventTimeline: EventTimelineEntry[];
}

export interface EventTimelineEntry {
  eventKey: string;
  myChoice: 'a' | 'b';
  opponentChoice: 'a' | 'b';
  myIntent: HiddenIntent;
  opponentIntent: HiddenIntent;
  myEdge: number;
  opponentEdge: number;
  myOutread: boolean | null;
  opponentOutread: boolean | null;
}

// ── Supabase row types (DB) ───────────────────────────────────────────────────

export interface MatchRow {
  id: string;
  join_code: string;
  status: MatchStatus;
  rules: MatchRules;
  server_start_ts: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface MatchPlayerRow {
  id: string;
  match_id: string;
  player_id: string;
  slot: MatchPlayerSlot;
  session_id: string | null;
  status: MatchPlayerStatus;
  read_tokens_remaining: number;
  decision_score: number;
  final_portfolio: number | null;
  composite_score: number | null;
  joined_at: string;
  finished_at: string | null;
}

export interface MatchEventMoveRow {
  id: string;
  match_id: string;
  event_key: string;
  player_id: string;
  slot: MatchPlayerSlot;
  public_choice: 'a' | 'b';
  hidden_intent: HiddenIntent;
  used_read_token: boolean;
  bluff_action: BluffAction;
  submitted_at: string;
}

export interface MatchEventOutcomeRow {
  id: string;
  match_id: string;
  event_key: string;
  slot_a_edge: number;
  slot_b_edge: number;
  slot_a_outread: boolean | null;
  slot_b_outread: boolean | null;
  slot_a_bluff_success: boolean | null;
  slot_b_bluff_success: boolean | null;
  resolved_at: string;
}
