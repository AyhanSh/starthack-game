import type { DecisionSubmission } from '../types/multiplayer.types';
import type { MatchEventMoveRow, MatchPlayerRow } from '../types/multiplayer.types';
import { EDGE_VALUES, computeFinalMatchScore, normaliseDecisionScore } from './DecisionEngine';

/**
 * FairnessValidator runs on the CLIENT before submitting moves to the server.
 * The server-side DB trigger is the authoritative resolver — this layer catches
 * obviously invalid submissions early and prevents unnecessary round-trips.
 *
 * It also validates server-returned scores to detect tampering on the wire.
 */
export class FairnessValidator {

  // ── Move validation ───────────────────────────────────────────────────────

  /**
   * Validates a DecisionSubmission before sending to Supabase.
   * Returns null if valid, or an error message string if invalid.
   */
  static validateSubmission(
    submission: DecisionSubmission,
    readTokensRemaining: number,
  ): string | null {
    const { publicChoice, hiddenIntent, useReadToken, bluffAction } = submission;

    if (publicChoice !== 'a' && publicChoice !== 'b') {
      return 'Invalid public choice value.';
    }

    if (!['defensive', 'neutral', 'aggressive'].includes(hiddenIntent)) {
      return 'Invalid hidden intent value.';
    }

    if (!['none', 'bluff', 'call_bluff'].includes(bluffAction)) {
      return 'Invalid bluff action.';
    }

    if (useReadToken && readTokensRemaining <= 0) {
      return 'No read tokens remaining.';
    }

    // Mutual exclusion is enforced by the type; no additional runtime check needed.

    return null;
  }

  // ── Duplicate-submission guard ────────────────────────────────────────────

  /**
   * Checks whether the player has already submitted for this event.
   * Prevents double-submission race conditions.
   */
  static hasAlreadySubmitted(
    existingMoves: MatchEventMoveRow[],
    playerId: string,
    eventKey: string,
  ): boolean {
    return existingMoves.some(
      (m) => m.player_id === playerId && m.event_key === eventKey,
    );
  }

  // ── Score plausibility check ──────────────────────────────────────────────

  /**
   * Validates that a player row's decision_score is within the maximum
   * achievable range for the number of events that occurred.
   * Returns true if plausible, false if suspicious.
   */
  static isDecisionScorePlausible(
    player: MatchPlayerRow,
    eventCount: number,
  ): boolean {
    const maxPerEvent =
      EDGE_VALUES.holdBonus +
      EDGE_VALUES.aggressiveConsistency +
      EDGE_VALUES.correctRead +
      EDGE_VALUES.callBluffSuccess;
    const maxTotal = maxPerEvent * Math.max(eventCount, 1);

    // Allow 5% tolerance for rounding
    return player.decision_score <= maxTotal * 1.05;
  }

  // ── Final score plausibility ───────────────────────────────────────────────

  /**
   * Verifies that the client-computed final match score matches what
   * the server would derive from persisted data (within tolerance).
   *
   * Used to detect if a client is reporting a tampered composite_score.
   */
  static isFinalScorePlausible(options: {
    reportedFinalScore: number;
    portfolioScore: number;
    rawDecisionScore: number;
    eventCount: number;
    tolerancePts?: number;
  }): boolean {
    const { reportedFinalScore, portfolioScore, rawDecisionScore, eventCount, tolerancePts = 2 } = options;

    const expectedScore = computeFinalMatchScore({
      portfolioScore,
      rawDecisionScore,
      eventCount,
    });

    return Math.abs(reportedFinalScore - expectedScore) <= tolerancePts;
  }

  // ── Match timing guard ────────────────────────────────────────────────────

  /**
   * Ensures a decision submission arrives within the allowed window.
   * Returns true if the submission time is within the window, false if late.
   */
  static isWithinDecisionWindow(
    windowExpiresAt: number,
    submittedAt: number = Date.now(),
    gracePeriodMs: number = 3000,
  ): boolean {
    return submittedAt <= windowExpiresAt + gracePeriodMs;
  }

  // ── Telemetry: flag suspicious patterns ──────────────────────────────────

  /**
   * Detects patterns that might indicate automated play or cheating.
   * Returns an array of warning strings (empty means clean).
   */
  static detectSuspiciousPatterns(
    moves: MatchEventMoveRow[],
    eventCount: number,
  ): string[] {
    const warnings: string[] = [];

    // Pattern 1: Always aggressive + always 'b' + always read token = max-gaming
    const allAggressive = moves.every((m) => m.hidden_intent === 'aggressive');
    const allHold = moves.every((m) => m.public_choice === 'b');
    const allReadToken = moves.every((m) => m.used_read_token);
    if (moves.length > 2 && allAggressive && allHold && allReadToken) {
      warnings.push('Always aggressive + hold + read: possible scripted strategy');
    }

    // Pattern 2: Submissions arrived under 1 second after window opens (inhuman speed)
    // We can't check timing here without window-open timestamps, but flag for server
    if (moves.length >= 3) {
      const allCallBluff = moves.every((m) => m.bluff_action === 'call_bluff');
      if (allCallBluff) {
        warnings.push('Always call_bluff: possible knowledge of opponent moves');
      }
    }

    return warnings;
  }

  // ── Normalised score helper ────────────────────────────────────────────────

  static normalisedDecisionScore(rawScore: number, eventCount: number): number {
    return normaliseDecisionScore(rawScore, eventCount);
  }
}
