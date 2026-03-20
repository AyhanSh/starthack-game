/**
 * MultiplayerTelemetry
 *
 * Lightweight client-side event logging for multiplayer reliability.
 * Writes to console in dev; can be forwarded to any analytics endpoint.
 *
 * Events tracked:
 * - match_created, match_joined
 * - opponent_joined, both_ready, countdown_start, game_start
 * - decision_opened, decision_submitted, decision_timed_out
 * - outcome_received
 * - match_finished, reconnect_attempt, reconnect_success, reconnect_failed
 * - drop_off (phase when the user abandoned)
 */

type TelemetryEvent =
  | { name: 'match_created';           matchId: string; slot: string }
  | { name: 'match_joined';            matchId: string; slot: string }
  | { name: 'opponent_joined';         matchId: string }
  | { name: 'both_ready';              matchId: string }
  | { name: 'countdown_start';         matchId: string }
  | { name: 'game_start';              matchId: string }
  | { name: 'decision_opened';         matchId: string; eventKey: string }
  | { name: 'decision_submitted';      matchId: string; eventKey: string; latencyMs: number }
  | { name: 'decision_timed_out';      matchId: string; eventKey: string }
  | { name: 'outcome_received';        matchId: string; eventKey: string; myEdge: number }
  | { name: 'match_finished';          matchId: string; winner: string; myFinalScore: number }
  | { name: 'reconnect_attempt';       matchId: string }
  | { name: 'reconnect_success';       matchId: string }
  | { name: 'reconnect_failed';        matchId: string }
  | { name: 'drop_off';                phase: string }
  | { name: 'fairness_violation';      matchId: string; reason: string }
  | { name: 'suspicious_pattern';      matchId: string; patterns: string[] };

export class MultiplayerTelemetry {
  private static buffer: Array<TelemetryEvent & { ts: number }> = [];
  private static isDev = import.meta.env.DEV;

  private static track(event: TelemetryEvent): void {
    const entry = { ...event, ts: Date.now() };
    MultiplayerTelemetry.buffer.push(entry);

    if (MultiplayerTelemetry.isDev) {
      console.debug(`[MP Telemetry] ${event.name}`, entry);
    }

    // In production you would POST to your analytics endpoint here:
    // fetch('/api/telemetry', { method: 'POST', body: JSON.stringify(entry) });
  }

  static matchCreated(matchId: string, slot: string): void {
    this.track({ name: 'match_created', matchId, slot });
  }

  static matchJoined(matchId: string, slot: string): void {
    this.track({ name: 'match_joined', matchId, slot });
  }

  static opponentJoined(matchId: string): void {
    this.track({ name: 'opponent_joined', matchId });
  }

  static bothReady(matchId: string): void {
    this.track({ name: 'both_ready', matchId });
  }

  static countdownStart(matchId: string): void {
    this.track({ name: 'countdown_start', matchId });
  }

  static gameStart(matchId: string): void {
    this.track({ name: 'game_start', matchId });
  }

  static decisionOpened(matchId: string, eventKey: string): void {
    this.track({ name: 'decision_opened', matchId, eventKey });
    // Store open time for latency calculation
    MultiplayerTelemetry.openTimes.set(`${matchId}:${eventKey}`, Date.now());
  }

  static decisionSubmitted(matchId: string, eventKey: string): void {
    const openTime = MultiplayerTelemetry.openTimes.get(`${matchId}:${eventKey}`) ?? Date.now();
    const latencyMs = Date.now() - openTime;
    MultiplayerTelemetry.openTimes.delete(`${matchId}:${eventKey}`);
    this.track({ name: 'decision_submitted', matchId, eventKey, latencyMs });
  }

  static decisionTimedOut(matchId: string, eventKey: string): void {
    MultiplayerTelemetry.openTimes.delete(`${matchId}:${eventKey}`);
    this.track({ name: 'decision_timed_out', matchId, eventKey });
  }

  static outcomeReceived(matchId: string, eventKey: string, myEdge: number): void {
    this.track({ name: 'outcome_received', matchId, eventKey, myEdge });
  }

  static matchFinished(matchId: string, winner: string, myFinalScore: number): void {
    this.track({ name: 'match_finished', matchId, winner, myFinalScore });
  }

  static reconnectAttempt(matchId: string): void {
    this.track({ name: 'reconnect_attempt', matchId });
  }

  static reconnectSuccess(matchId: string): void {
    this.track({ name: 'reconnect_success', matchId });
  }

  static reconnectFailed(matchId: string): void {
    this.track({ name: 'reconnect_failed', matchId });
  }

  static dropOff(phase: string): void {
    this.track({ name: 'drop_off', phase });
  }

  static fairnessViolation(matchId: string, reason: string): void {
    this.track({ name: 'fairness_violation', matchId, reason });
  }

  static suspiciousPattern(matchId: string, patterns: string[]): void {
    this.track({ name: 'suspicious_pattern', matchId, patterns });
  }

  /** Returns a copy of the telemetry buffer for debugging. */
  static getBuffer(): ReadonlyArray<TelemetryEvent & { ts: number }> {
    return [...MultiplayerTelemetry.buffer];
  }

  /** Clears the buffer. */
  static flush(): void {
    MultiplayerTelemetry.buffer = [];
  }

  private static openTimes = new Map<string, number>();
}
