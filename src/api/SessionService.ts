import { getSupabase } from './supabase';
import type { BehavioralProfile, ChainState } from '../types';

export interface CreateSessionInput {
  playerId: string;
  seedId: string;
  startingPortfolio: number;
  monthlyContribution: number;
}

export interface CompleteSessionInput {
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

export async function createSession(input: CreateSessionInput): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      player_id: input.playerId,
      seed_id: input.seedId,
      starting_portfolio: input.startingPortfolio,
      monthly_contribution: input.monthlyContribution,
      completed: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[SessionService] createSession failed:', error);
    return null;
  }

  return data?.id ?? null;
}

export async function completeSession(sessionId: string, input: CompleteSessionInput): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('game_sessions')
    .update({
      final_portfolio: input.finalPortfolio,
      benchmark_final: input.benchmarkFinal,
      behavioral_profile: input.behavioralProfile,
      composite_score: input.compositeScore,
      total_rebalances: input.totalRebalances,
      panic_rebalances: input.panicRebalances,
      cash_heavy_weeks: input.cashHeavyWeeks,
      max_drawdown_pct: input.maxDrawdownPct,
      chain_state: input.chainState,
      duration_seconds: input.durationSeconds,
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('[SessionService] completeSession failed:', error);
    return false;
  }

  return true;
}
