import { getSupabase } from './supabase';
import { createPlayer } from './PlayerService';
import { completeSession } from './SessionService';
import type { LeaderboardEntry, BehavioralProfile, ChainState } from '../types';

export async function fetchLeaderboard(
  seedId?: string,
  limit: number = 50,
): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from('leaderboard')
    .select('*')
    .order('composite_score', { ascending: false })
    .limit(limit);

  if (seedId) {
    query = query.eq('seed_id', seedId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[LeaderboardService] fetchLeaderboard failed:', error);
    return [];
  }

  return (data ?? []) as LeaderboardEntry[];
}

export interface SubmitScoreInput {
  nickname: string;
  avatar: string;
  sessionId: string | null;
  finalPortfolio: number;
  benchmarkFinal: number;
  behavioralProfile: BehavioralProfile;
  compositeScore: number;
  totalRebalances: number;
  panicRebalances: number;
  cashHeavyWeeks: number;
  maxDrawdownPct: number;
  chainState: ChainState;
  durationSeconds: number;
}

/**
 * Creates/updates the player record and marks the session as completed.
 * Returns the player id on success, null on failure or offline.
 */
export async function submitScore(input: SubmitScoreInput): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[LeaderboardService] Offline — score not persisted.');
    return null;
  }

  // Upsert player (device-keyed, so re-runs are idempotent)
  const player = await createPlayer(input.nickname, input.avatar);
  if (!player) {
    console.error('[LeaderboardService] Could not create/update player.');
    return null;
  }

  // If we have a session id, complete it; otherwise nothing more to do
  if (input.sessionId) {
    const ok = await completeSession(input.sessionId, {
      finalPortfolio: input.finalPortfolio,
      benchmarkFinal: input.benchmarkFinal,
      behavioralProfile: input.behavioralProfile,
      compositeScore: input.compositeScore,
      totalRebalances: input.totalRebalances,
      panicRebalances: input.panicRebalances,
      cashHeavyWeeks: input.cashHeavyWeeks,
      maxDrawdownPct: input.maxDrawdownPct,
      chainState: input.chainState,
      durationSeconds: input.durationSeconds,
    });
    if (!ok) {
      console.error('[LeaderboardService] completeSession failed.');
    }
  }

  return player.id;
}
