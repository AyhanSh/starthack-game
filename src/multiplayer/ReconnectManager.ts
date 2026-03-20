import * as MatchService from './MatchService';
import type { MultiplayerStore } from './MultiplayerStore';
import type { MatchPlayerSlot, OpponentInfo } from '../types/multiplayer.types';

/**
 * ReconnectManager handles:
 * - Rehydrating match state after page reload / connection drop.
 * - Detecting and handling decision-window timeouts.
 * - Detecting opponent disconnect/timeout and notifying the UI.
 */
export class ReconnectManager {
  private store: MultiplayerStore;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private decisionTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private myPlayerId: string = '';

  /** After this many ms with no opponent update we mark them disconnected */
  private static OPPONENT_TIMEOUT_MS = 30_000;
  private lastOpponentActivity: number = Date.now();

  constructor(store: MultiplayerStore, myPlayerId: string) {
    this.store = store;
    this.myPlayerId = myPlayerId;
  }

  // ── Rehydrate after page reload ───────────────────────────────────────────

  /**
   * Restore in-progress match from Supabase.
   * Called on mount when localStorage contains a saved matchId.
   */
  async rehydrate(matchId: string): Promise<boolean> {
    const match = await MatchService.fetchMatch(matchId);
    if (!match) return false;

    if (match.status === 'finished' || match.status === 'abandoned') {
      this.clearSavedMatch();
      return false;
    }

    const players = await MatchService.fetchMatchPlayers(matchId);
    const myRow = players.find((p) => p.player_id === this.myPlayerId);
    const opRow = players.find((p) => p.player_id !== this.myPlayerId);

    if (!myRow) return false;

    const rules = match.rules;

    if (match.status === 'in_progress' || match.status === 'countdown' || match.status === 'both_joined') {
      // Re-enter waiting/playing state
      const mySlot = myRow.slot as MatchPlayerSlot;

      this.store.dispatch({
        type: 'MATCH_JOINED',
        matchId: match.id,
        joinCode: match.join_code,
        mySlot,
        rules,
      });

      if (opRow) {
        const opponent: OpponentInfo = {
          playerId: opRow.player_id,
          nickname: '???',
          avatar: '🎮',
          slot: opRow.slot as MatchPlayerSlot,
          status: opRow.status,
          decisionScore: opRow.decision_score,
          finalPortfolio: opRow.final_portfolio,
          compositeScore: opRow.composite_score,
        };
        this.store.dispatch({ type: 'OPPONENT_JOINED', opponent });
      }

      if (match.status === 'in_progress' && match.server_start_ts) {
        this.store.dispatch({
          type: 'GAME_STARTED',
          serverStartTs: new Date(match.server_start_ts).getTime(),
        });
      }

      return true;
    }

    return false;
  }

  // ── Persist / clear saved match ───────────────────────────────────────────

  static saveMatchId(matchId: string): void {
    try {
      localStorage.setItem('wma_mp_match_id', matchId);
    } catch {
      // ignore storage errors
    }
  }

  static loadSavedMatchId(): string | null {
    try {
      return localStorage.getItem('wma_mp_match_id');
    } catch {
      return null;
    }
  }

  clearSavedMatch(): void {
    try {
      localStorage.removeItem('wma_mp_match_id');
    } catch {
      // ignore
    }
  }

  // ── Heartbeat: detect opponent activity / disconnect ─────────────────────

  startHeartbeat(matchId: string): void {
    this.stopHeartbeat();
    this.lastOpponentActivity = Date.now();

    this.heartbeatInterval = setInterval(async () => {
      const players = await MatchService.fetchMatchPlayers(matchId);
      const opRow = players.find((p) => p.player_id !== this.myPlayerId);

      if (opRow) {
        this.lastOpponentActivity = Date.now();
        const currentOp = this.store.getState().opponent;
        if (currentOp && opRow.decision_score !== currentOp.decisionScore) {
          const updated: OpponentInfo = {
            ...currentOp,
            decisionScore: opRow.decision_score,
            finalPortfolio: opRow.final_portfolio,
            compositeScore: opRow.composite_score,
            status: opRow.status,
          };
          this.store.dispatch({ type: 'OPPONENT_STATUS_UPDATED', opponent: updated });
        }
      }

      const sinceActivity = Date.now() - this.lastOpponentActivity;
      if (sinceActivity > ReconnectManager.OPPONENT_TIMEOUT_MS) {
        const op = this.store.getState().opponent;
        if (op && op.status !== 'disconnected') {
          this.store.dispatch({
            type: 'OPPONENT_STATUS_UPDATED',
            opponent: { ...op, status: 'disconnected' },
          });
        }
      }
    }, 8_000);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ── Decision-window timeout ────────────────────────────────────────────────

  /**
   * Schedules a local timeout that auto-submits with defaults if the
   * player has not submitted before `expiresAt`.
   * The caller provides an `onTimeout` callback.
   */
  scheduleDecisionTimeout(expiresAt: number, onTimeout: () => void): void {
    this.clearDecisionTimeout();
    const delay = Math.max(expiresAt - Date.now(), 0);
    this.decisionTimeoutHandle = setTimeout(() => {
      const state = this.store.getState();
      if (state.activeDecisionWindow) {
        onTimeout();
      }
    }, delay + 500); // 500ms grace period
  }

  clearDecisionTimeout(): void {
    if (this.decisionTimeoutHandle) {
      clearTimeout(this.decisionTimeoutHandle);
      this.decisionTimeoutHandle = null;
    }
  }

  // ── Lobby timeout (opponent no-show) ──────────────────────────────────────

  /**
   * Returns a cleanup function. If opponent has not joined within
   * `timeoutMs`, calls `onTimeout`.
   */
  scheduleLobbyTimeout(timeoutMs: number, onTimeout: () => void): () => void {
    const handle = setTimeout(() => {
      const { opponent } = this.store.getState();
      if (!opponent) onTimeout();
    }, timeoutMs);

    return () => clearTimeout(handle);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  destroy(): void {
    this.stopHeartbeat();
    this.clearDecisionTimeout();
  }
}
