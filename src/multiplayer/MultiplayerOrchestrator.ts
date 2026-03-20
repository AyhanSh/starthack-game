import { MultiplayerStore } from './MultiplayerStore';
import { ReconnectManager } from './ReconnectManager';
import { FairnessValidator } from './FairnessValidator';
import { MultiplayerTelemetry } from './MultiplayerTelemetry';
import * as MatchService from './MatchService';
import type {
  MatchRules,
  DecisionSubmission,
  DecisionWindow,
  MatchEventOutcome,
  OpponentInfo,
} from '../types/multiplayer.types';
import type { MatchRow, MatchPlayerRow } from '../types/multiplayer.types';

const DEFAULT_COUNTDOWN_SECS = 3;
const DECISION_TIMEOUT_SECS = 60;

/**
 * MultiplayerOrchestrator sits between the UI and the match service/store.
 * It drives the full lifecycle: create/join → wait → countdown → playing → results.
 */
export class MultiplayerOrchestrator {
  private store: MultiplayerStore;
  private reconnect: ReconnectManager | null = null;
  private unsubscribeRealtime: (() => void) | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<() => void> = new Set();
  private cancelLobbyTimeout: (() => void) | null = null;

  // Cached identities (set on create/join)
  private myPlayerId: string = '';
  private myNickname: string = '';
  private myAvatar: string = '';

  constructor(store: MultiplayerStore) {
    this.store = store;
  }

  // ── Rehydrate (reconnect after reload) ───────────────────────────────────

  async tryReconnect(myPlayerId: string): Promise<boolean> {
    const savedId = ReconnectManager.loadSavedMatchId();
    if (!savedId) return false;

    this.myPlayerId = myPlayerId;
    if (!this.reconnect) {
      this.reconnect = new ReconnectManager(this.store, myPlayerId);
    }
    MultiplayerTelemetry.reconnectAttempt(savedId);
    const ok = await this.reconnect.rehydrate(savedId);
    if (ok) {
      MultiplayerTelemetry.reconnectSuccess(savedId);
      this.attachRealtime(savedId);
      this.reconnect.startHeartbeat(savedId);
    } else {
      MultiplayerTelemetry.reconnectFailed(savedId);
      this.reconnect.clearSavedMatch();
    }
    return ok;
  }

  // ── Subscribe ────────────────────────────────────────────────────────────

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    const unsubStore = this.store.subscribe(fn);
    return () => {
      this.listeners.delete(fn);
      unsubStore();
    };
  }

  getState() {
    return this.store.getState();
  }

  // ── Create match ─────────────────────────────────────────────────────────

  async createMatch(
    playerId: string,
    nickname: string,
    avatar: string,
    rules: MatchRules,
  ): Promise<boolean> {
    this.myPlayerId = playerId;
    this.myNickname = nickname;
    this.myAvatar = avatar;

    const result = await MatchService.createMatch(playerId, rules);
    if (!result) {
      this.store.dispatch({ type: 'SET_ERROR', error: 'Failed to create match. Check connection.' });
      return false;
    }

    this.store.dispatch({
      type: 'MATCH_CREATED',
      matchId: result.match.id,
      joinCode: result.match.join_code,
      mySlot: result.mySlot,
      rules,
    });

    MultiplayerTelemetry.matchCreated(result.match.id, result.mySlot);

    this.reconnect = new ReconnectManager(this.store, playerId);
    ReconnectManager.saveMatchId(result.match.id);
    this.attachRealtime(result.match.id);
    this.startPolling(result.match.id);

    // Lobby timeout: if no one joins within 5 minutes
    this.cancelLobbyTimeout = this.reconnect.scheduleLobbyTimeout(5 * 60_000, () => {
      this.store.dispatch({ type: 'SET_ERROR', error: 'No opponent joined. Match expired.' });
    });

    return true;
  }

  // ── Join match ───────────────────────────────────────────────────────────

  async joinMatch(
    playerId: string,
    nickname: string,
    avatar: string,
    joinCode: string,
  ): Promise<boolean> {
    this.myPlayerId = playerId;
    this.myNickname = nickname;
    this.myAvatar = avatar;

    const result = await MatchService.joinMatch(playerId, joinCode);
    if (!result) {
      this.store.dispatch({ type: 'SET_ERROR', error: 'Match not found or already started.' });
      return false;
    }

    this.store.dispatch({
      type: 'MATCH_JOINED',
      matchId: result.match.id,
      joinCode: result.match.join_code,
      mySlot: result.mySlot,
      rules: result.match.rules as MatchRules,
    });

    MultiplayerTelemetry.matchJoined(result.match.id, result.mySlot);

    this.reconnect = new ReconnectManager(this.store, playerId);
    ReconnectManager.saveMatchId(result.match.id);
    this.attachRealtime(result.match.id);
    this.startPolling(result.match.id);
    return true;
  }

  // ── Signal ready ─────────────────────────────────────────────────────────

  async signalReady(): Promise<void> {
    const { matchId, mySlot } = this.store.getState();
    if (!matchId || !mySlot) return;

    await MatchService.signalReady(matchId, this.myPlayerId);
  }

  // ── Link game session ─────────────────────────────────────────────────────

  async linkSession(sessionId: string): Promise<void> {
    const { matchId } = this.store.getState();
    if (!matchId) return;
    await MatchService.linkSessionToMatchPlayer(matchId, this.myPlayerId, sessionId);
  }

  // ── Submit event decision ─────────────────────────────────────────────────

  async submitDecision(eventKey: string, submission: DecisionSubmission): Promise<void> {
    const { matchId, mySlot, activeDecisionWindow } = this.store.getState();
    if (!matchId || !mySlot) return;

    // Fairness: validate submission shape
    const validationError = FairnessValidator.validateSubmission(submission, 2);
    if (validationError) {
      console.warn('[Fairness] Invalid submission:', validationError);
      MultiplayerTelemetry.fairnessViolation(matchId, validationError);
      this.store.dispatch({ type: 'SET_ERROR', error: validationError });
      return;
    }

    // Fairness: check we're within the decision window
    if (activeDecisionWindow && !FairnessValidator.isWithinDecisionWindow(activeDecisionWindow.expiresAt)) {
      console.warn('[Fairness] Submission arrived after window expiry');
    }

    // Fairness: guard against duplicate submissions
    const existingMoves = await MatchService.fetchEventMoves(matchId, eventKey);
    if (FairnessValidator.hasAlreadySubmitted(existingMoves, this.myPlayerId, eventKey)) {
      console.warn('[Fairness] Duplicate submission blocked for', eventKey);
      this.store.dispatch({ type: 'CLOSE_DECISION_WINDOW' });
      return;
    }

    this.reconnect?.clearDecisionTimeout();
    MultiplayerTelemetry.decisionSubmitted(matchId, eventKey);
    this.store.dispatch({ type: 'CLOSE_DECISION_WINDOW' });

    await MatchService.submitEventMove(
      matchId,
      this.myPlayerId,
      mySlot,
      eventKey,
      submission,
    );

    // Poll for outcome from the DB (resolves via trigger when both submit)
    this.pollForOutcome(matchId, eventKey);
  }

  // ── Finish match ──────────────────────────────────────────────────────────

  async finishMatch(finalPortfolio: number, compositeScore: number): Promise<void> {
    const { matchId } = this.store.getState();
    if (!matchId) return;

    this.reconnect?.stopHeartbeat();
    await MatchService.completeMatchPlayer(matchId, this.myPlayerId, finalPortfolio, compositeScore);
    this.reconnect?.clearSavedMatch();
    this.buildAndDispatchResult(matchId);
  }

  // ── Open a decision window (called by game loop when event fires) ─────────

  openDecisionWindow(eventKey: string): void {
    const { rules } = this.store.getState();
    const timeout = rules?.decisionTimeoutSeconds ?? DECISION_TIMEOUT_SECS;
    const expiresAt = Date.now() + timeout * 1000;
    const window: DecisionWindow = {
      eventKey,
      publicChoiceRequired: true,
      intentRequired: true,
      readTokenAvailable: (this.store.getState().mySlot !== null),
      bluffAvailable: true,
      expiresAt,
    };
    this.store.dispatch({ type: 'OPEN_DECISION_WINDOW', window });

    const matchId = this.store.getState().matchId ?? '';
    MultiplayerTelemetry.decisionOpened(matchId, eventKey);

    // Auto-submit default decision if player doesn't respond in time
    this.reconnect?.scheduleDecisionTimeout(expiresAt, () => {
      const state = this.store.getState();
      if (state.activeDecisionWindow?.eventKey === eventKey) {
        MultiplayerTelemetry.decisionTimedOut(matchId, eventKey);
        this.submitDecision(eventKey, {
          publicChoice: 'b',
          hiddenIntent: 'neutral',
          useReadToken: false,
          bluffAction: 'none',
        });
      }
    });
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  destroy(): void {
    this.stopPolling();
    this.stopCountdown();
    this.cancelLobbyTimeout?.();
    this.cancelLobbyTimeout = null;
    this.unsubscribeRealtime?.();
    this.unsubscribeRealtime = null;
    this.reconnect?.destroy();
    this.reconnect = null;
  }

  // ── Internal: Realtime ────────────────────────────────────────────────────

  private attachRealtime(matchId: string): void {
    this.unsubscribeRealtime?.();
    this.unsubscribeRealtime = MatchService.subscribeToMatch(matchId, (payload) => {
      this.handleRealtimeUpdate(payload);
    });
  }

  private handleRealtimeUpdate(payload: { table: string; new: Record<string, unknown> }): void {
    if (payload.table === 'matches') {
      this.onMatchRowUpdated(payload.new as unknown as MatchRow);
    } else if (payload.table === 'match_players') {
      this.onMatchPlayerUpdated(payload.new as unknown as MatchPlayerRow);
    } else if (payload.table === 'match_event_outcomes') {
      this.onEventOutcomeInserted(payload.new as unknown as MatchEventOutcome);
    }
  }

  private onMatchRowUpdated(row: MatchRow): void {
    const { phase } = this.store.getState();

    if (row.status === 'both_joined' && phase === 'multiplayer-waiting') {
      this.cancelLobbyTimeout?.();
      this.cancelLobbyTimeout = null;
      MultiplayerTelemetry.opponentJoined(row.id);
      this.refreshPlayers(row.id);
    } else if (row.status === 'countdown' && phase !== 'multiplayer-countdown' && phase !== 'multiplayer-playing') {
      MultiplayerTelemetry.countdownStart(row.id);
      this.stopPolling();
      this.startCountdown(row.id);
    } else if (row.status === 'in_progress' && row.server_start_ts && phase !== 'multiplayer-playing') {
      MultiplayerTelemetry.gameStart(row.id);
      this.stopPolling();
      this.stopCountdown();
      this.store.dispatch({
        type: 'GAME_STARTED',
        serverStartTs: new Date(row.server_start_ts).getTime(),
      });
      this.reconnect?.startHeartbeat(row.id);
    }
  }

  private onMatchPlayerUpdated(row: MatchPlayerRow): void {
    const { mySlot } = this.store.getState();
    const isMe = row.player_id === this.myPlayerId;
    if (isMe) return; // ignore own updates

    const opponent: OpponentInfo = {
      playerId: row.player_id,
      nickname: this.store.getState().opponent?.nickname ?? '???',
      avatar: this.store.getState().opponent?.avatar ?? '🎮',
      slot: row.slot,
      status: row.status,
      decisionScore: row.decision_score,
      finalPortfolio: row.final_portfolio,
      compositeScore: row.composite_score,
    };

    if (row.status === 'ready') {
      this.store.dispatch({ type: 'OPPONENT_READY' });
    }
    this.store.dispatch({ type: 'OPPONENT_STATUS_UPDATED', opponent });
  }

  private onEventOutcomeInserted(outcome: MatchEventOutcome): void {
    const { mySlot } = this.store.getState();
    if (!mySlot) return;
    this.store.dispatch({ type: 'EVENT_OUTCOME_RECEIVED', outcome, mySlot });
  }

  // ── Internal: Polling (fallback for realtime gaps) ───────────────────────

  private startPolling(matchId: string): void {
    this.pollTimer = setInterval(async () => {
      const state = this.store.getState();
      if (state.phase === 'multiplayer-playing' || state.phase === 'multiplayer-results') {
        this.stopPolling();
        return;
      }
      await this.refreshPlayers(matchId);
      const match = await MatchService.fetchMatch(matchId);
      if (match) this.onMatchRowUpdated(match);
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ── Internal: Countdown ───────────────────────────────────────────────────

  private startCountdown(matchId: string): void {
    const { rules } = this.store.getState();
    let secs = rules?.countdownSeconds ?? DEFAULT_COUNTDOWN_SECS;
    this.store.dispatch({ type: 'SET_PHASE', phase: 'multiplayer-countdown' });
    this.store.dispatch({ type: 'COUNTDOWN_TICK', secondsLeft: secs });

    this.countdownTimer = setInterval(async () => {
      secs -= 1;
      this.store.dispatch({ type: 'COUNTDOWN_TICK', secondsLeft: secs });
      if (secs <= 0) {
        this.stopCountdown();
        await MatchService.startMatchGame(matchId);
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  // ── Internal: Players refresh ─────────────────────────────────────────────

  private async refreshPlayers(matchId: string): Promise<void> {
    const players = await MatchService.fetchMatchPlayers(matchId);
    const opponentRow = players.find((p) => p.player_id !== this.myPlayerId);
    if (!opponentRow) return;

    const existing = this.store.getState().opponent;
    const opponent: OpponentInfo = {
      playerId: opponentRow.player_id,
      nickname: existing?.nickname ?? '???',
      avatar: existing?.avatar ?? '🎮',
      slot: opponentRow.slot,
      status: opponentRow.status,
      decisionScore: opponentRow.decision_score,
      finalPortfolio: opponentRow.final_portfolio,
      compositeScore: opponentRow.composite_score,
    };

    this.store.dispatch({ type: 'OPPONENT_JOINED', opponent });
  }

  // ── Internal: Poll for event outcome ─────────────────────────────────────

  private pollForOutcome(matchId: string, eventKey: string): void {
    const interval = setInterval(async () => {
      const outcome = await MatchService.fetchEventOutcome(matchId, eventKey);
      if (outcome) {
        clearInterval(interval);
        const { mySlot } = this.store.getState();
        if (mySlot) {
          this.store.dispatch({
            type: 'EVENT_OUTCOME_RECEIVED',
            outcome: outcome as unknown as MatchEventOutcome,
            mySlot,
          });
        }
      }
    }, 1500);

    // Safety timeout after 90 seconds
    setTimeout(() => clearInterval(interval), 90_000);
  }

  // ── Internal: Build final result ──────────────────────────────────────────

  private async buildAndDispatchResult(matchId: string): Promise<void> {
    const players = await MatchService.fetchMatchPlayers(matchId);
    const outcomes = await MatchService.fetchMatchOutcomes(matchId);
    const allMoves = await MatchService.fetchAllMatchMoves(matchId);
    const { mySlot } = this.store.getState();
    if (!mySlot) return;

    const myPlayer = players.find((p) => p.player_id === this.myPlayerId);
    const opponentPlayer = players.find((p) => p.player_id !== this.myPlayerId);
    if (!myPlayer || !opponentPlayer) return;

    const result = this.store.buildMatchResult(mySlot, myPlayer, opponentPlayer, outcomes, allMoves);
    this.store.dispatch({ type: 'MATCH_FINISHED', result });
  }
}
