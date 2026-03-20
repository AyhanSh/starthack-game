import type {
  HiddenIntent,
  BluffAction,
  MatchEventOutcomeRow,
  MatchEventMoveRow,
  MatchPlayerSlot,
  EventTimelineEntry,
} from '../types/multiplayer.types';

// ── Constants ──────────────────────────────────────────────────────────────

export const DECISION_WEIGHTS = {
  /** Weight of portfolio score in final match score (0–1) */
  portfolio: 0.65,
  /** Weight of decision/mind-game score in final match score (0–1) */
  decision: 0.35,
} as const;

export const EDGE_VALUES = {
  /** Holding/staying invested (public choice 'b') */
  holdBonus: 5,
  /** Correct read token usage */
  correctRead: 8,
  /** Wrong read token usage penalty */
  wrongRead: -3,
  /** Successful bluff (opponent did not call) */
  bluffSuccess: 6,
  /** Being called when bluffing */
  bluffFailed: -4,
  /** Successfully calling opponent's bluff */
  callBluffSuccess: 10,
  /** Aggressive intent + holding through volatility */
  aggressiveConsistency: 3,
} as const;

// ── Client-side edge preview (mirrors DB trigger logic) ───────────────────

export interface PreviewEdgeInput {
  myChoice: 'a' | 'b';
  myIntent: HiddenIntent;
  useReadToken: boolean;
  bluffAction: BluffAction;
  /** Assumed opponent intent for read-token preview (unknown = null) */
  estimatedOpponentIntent?: HiddenIntent | null;
}

/**
 * Returns a best-case and worst-case edge preview for the player
 * based on their current decision inputs.
 *
 * Useful for showing real-time "potential edge" in the decision panel.
 */
export function previewEdge(input: PreviewEdgeInput): { best: number; worst: number } {
  let base = 0;

  if (input.myChoice === 'b') {
    base += EDGE_VALUES.holdBonus;
  }

  if (input.myIntent === 'aggressive' && input.myChoice === 'b') {
    base += EDGE_VALUES.aggressiveConsistency;
  }

  let best = base;
  let worst = base;

  if (input.useReadToken) {
    best += EDGE_VALUES.correctRead;
    worst += EDGE_VALUES.wrongRead;
  }

  if (input.bluffAction === 'bluff') {
    best += EDGE_VALUES.bluffSuccess;
    worst += EDGE_VALUES.bluffFailed;
  }

  if (input.bluffAction === 'call_bluff') {
    best += EDGE_VALUES.callBluffSuccess;
    worst += 0; // no penalty for calling incorrectly
  }

  return { best, worst };
}

// ── Decision score normaliser ─────────────────────────────────────────────

/**
 * Normalises accumulated decision edge (raw points) to 0–100 range
 * for use in the final composite score formula.
 *
 * Reference: maximum attainable edge per event ≈ 26 (hold + read + aggressive + bluffCall)
 * with e.g. 3 events = 78 max raw. Scale linearly.
 */
export function normaliseDecisionScore(rawScore: number, eventCount: number): number {
  const maxPerEvent =
    EDGE_VALUES.holdBonus +
    EDGE_VALUES.aggressiveConsistency +
    EDGE_VALUES.correctRead +
    EDGE_VALUES.callBluffSuccess;
  const maxTotal = Math.max(maxPerEvent * Math.max(eventCount, 1), 1);
  return Math.min(Math.max((rawScore / maxTotal) * 100, 0), 100);
}

// ── Final match score ─────────────────────────────────────────────────────

export interface FinalScoreInput {
  portfolioScore: number;       // composite_score from simulation (0–100)
  rawDecisionScore: number;     // accumulated edge points
  eventCount: number;           // how many events occurred
}

export function computeFinalMatchScore(input: FinalScoreInput): number {
  const normDecision = normaliseDecisionScore(input.rawDecisionScore, input.eventCount);
  return (
    DECISION_WEIGHTS.portfolio * input.portfolioScore +
    DECISION_WEIGHTS.decision  * normDecision
  );
}

// ── Behavioral summary ────────────────────────────────────────────────────

export type MindProfile =
  | 'psyche_warrior'      // high read + bluff success
  | 'stone_cold'          // consistently defensive, no bluffs
  | 'calculated_risk'     // aggressive intent + good holds
  | 'erratic'             // inconsistent (mixed winning/losing actions)
  | 'disciplined';        // neutral intent + clean hold record

export interface MindProfileDisplay {
  id: MindProfile;
  label: string;
  icon: string;
  description: string;
}

export function detectMindProfile(
  moves: MatchEventMoveRow[],
  outcomes: MatchEventOutcomeRow[],
  mySlot: MatchPlayerSlot,
): MindProfile {
  const myMoves = moves.filter((m) => m.slot === mySlot);
  const total = myMoves.length;
  if (total === 0) return 'disciplined';

  const reads = myMoves.filter((m) => m.used_read_token);
  const bluffs = myMoves.filter((m) => m.bluff_action === 'bluff');
  const calls = myMoves.filter((m) => m.bluff_action === 'call_bluff');
  const aggressiveMoves = myMoves.filter((m) => m.hidden_intent === 'aggressive');
  const holds = myMoves.filter((m) => m.public_choice === 'b');

  const successfulReads = outcomes.filter(
    (o) => mySlot === 'A' ? o.slot_a_outread === true : o.slot_b_outread === true,
  );
  const successfulBluffs = outcomes.filter(
    (o) => mySlot === 'A' ? o.slot_a_bluff_success === true : o.slot_b_bluff_success === true,
  );

  const readSuccessRate = reads.length > 0 ? successfulReads.length / reads.length : 0;
  const bluffSuccessRate = bluffs.length > 0 ? successfulBluffs.length / bluffs.length : 0;

  if ((reads.length + bluffs.length + calls.length) >= 2 &&
      (readSuccessRate + bluffSuccessRate) / 2 >= 0.6) {
    return 'psyche_warrior';
  }

  if (bluffs.length === 0 && calls.length === 0 && reads.length === 0 &&
      holds.length / total >= 0.8) {
    return 'stone_cold';
  }

  if (aggressiveMoves.length / total >= 0.5 && holds.length / total >= 0.6) {
    return 'calculated_risk';
  }

  const totalEdge = outcomes.reduce(
    (s, o) => s + (mySlot === 'A' ? o.slot_a_edge : o.slot_b_edge), 0,
  );
  if (totalEdge < 0) return 'erratic';

  return 'disciplined';
}

const MIND_PROFILE_MAP: Record<MindProfile, MindProfileDisplay> = {
  psyche_warrior: {
    id: 'psyche_warrior',
    label: 'Psyche Warrior',
    icon: '🧠',
    description: 'You read opponents and bluffed with precision. A true mind-game tactician.',
  },
  stone_cold: {
    id: 'stone_cold',
    label: 'Stone Cold',
    icon: '🗿',
    description: 'No tricks, no bluffs. Pure discipline and consistency.',
  },
  calculated_risk: {
    id: 'calculated_risk',
    label: 'Calculated Risk',
    icon: '⚔️',
    description: 'Bold intent backed by rational choices. High risk, high reward.',
  },
  erratic: {
    id: 'erratic',
    label: 'Erratic Trader',
    icon: '⚡',
    description: 'Your decisions lacked consistency. Opponents capitalised on unpredictability.',
  },
  disciplined: {
    id: 'disciplined',
    label: 'The Disciplined',
    icon: '🎯',
    description: 'Neutral, steady, and reliable. You played the long game in every dimension.',
  },
};

export function getMindProfileDisplay(profile: MindProfile): MindProfileDisplay {
  return MIND_PROFILE_MAP[profile];
}

// ── Timeline analysis ─────────────────────────────────────────────────────

export interface TimelineAnalysis {
  totalEdge: number;
  edgeWon: number;     // events where my edge > opponent edge
  edgeLost: number;    // events where my edge < opponent edge
  edgeTied: number;
  bestEvent: EventTimelineEntry | null;
  worstEvent: EventTimelineEntry | null;
}

export function analyseTimeline(entries: EventTimelineEntry[]): TimelineAnalysis {
  if (entries.length === 0) {
    return { totalEdge: 0, edgeWon: 0, edgeLost: 0, edgeTied: 0, bestEvent: null, worstEvent: null };
  }

  let totalEdge = 0;
  let edgeWon = 0;
  let edgeLost = 0;
  let edgeTied = 0;
  let bestEvent: EventTimelineEntry | null = null;
  let worstEvent: EventTimelineEntry | null = null;

  for (const entry of entries) {
    totalEdge += entry.myEdge;
    if (entry.myEdge > entry.opponentEdge) edgeWon++;
    else if (entry.myEdge < entry.opponentEdge) edgeLost++;
    else edgeTied++;

    if (!bestEvent || entry.myEdge > bestEvent.myEdge) bestEvent = entry;
    if (!worstEvent || entry.myEdge < worstEvent.myEdge) worstEvent = entry;
  }

  return { totalEdge, edgeWon, edgeLost, edgeTied, bestEvent, worstEvent };
}
