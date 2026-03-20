import { getSupabase } from '../api/supabase';
import type {
  MatchRow,
  MatchPlayerRow,
  MatchEventMoveRow,
  MatchEventOutcomeRow,
  MatchRules,
  MatchPlayerSlot,
  DecisionSubmission,
} from '../types/multiplayer.types';

// ── Utilities ──────────────────────────────────────────────────────────────

function generateJoinCode(): string {
  const words = ['BULL', 'BEAR', 'WOLF', 'HAWK', 'LYNX', 'FOX', 'STAG', 'IBEX'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${word}-${num}`;
}

// ── Match creation ─────────────────────────────────────────────────────────

export async function createMatch(
  playerId: string,
  rules: MatchRules,
): Promise<{ match: MatchRow; mySlot: MatchPlayerSlot } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const joinCode = generateJoinCode();

  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .insert({ join_code: joinCode, status: 'waiting_for_opponent', rules })
    .select()
    .single();

  if (matchErr || !match) {
    console.error('[MatchService] createMatch failed:', matchErr);
    return null;
  }

  const { error: playerErr } = await supabase
    .from('match_players')
    .insert({ match_id: match.id, player_id: playerId, slot: 'A' });

  if (playerErr) {
    console.error('[MatchService] createMatch — add host player failed:', playerErr);
    return null;
  }

  return { match: match as MatchRow, mySlot: 'A' };
}

// ── Join match ─────────────────────────────────────────────────────────────

export async function joinMatch(
  playerId: string,
  joinCode: string,
): Promise<{ match: MatchRow; mySlot: MatchPlayerSlot } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select()
    .eq('join_code', joinCode.toUpperCase())
    .eq('status', 'waiting_for_opponent')
    .single();

  if (matchErr || !match) {
    console.error('[MatchService] joinMatch — match not found:', matchErr);
    return null;
  }

  const { error: playerErr } = await supabase
    .from('match_players')
    .insert({ match_id: match.id, player_id: playerId, slot: 'B' });

  if (playerErr) {
    console.error('[MatchService] joinMatch — insert player B failed:', playerErr);
    if (playerErr.code === '23505') {
      console.error('[MatchService] joinMatch — you cannot join your own match (same player_id).');
    }
    return null;
  }

  // Advance match to both_joined
  await supabase
    .from('matches')
    .update({ status: 'both_joined' })
    .eq('id', match.id);

  return { match: match as MatchRow, mySlot: 'B' };
}

// ── Fetch match state ──────────────────────────────────────────────────────

export async function fetchMatch(matchId: string): Promise<MatchRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('matches')
    .select()
    .eq('id', matchId)
    .single();

  if (error) return null;
  return data as MatchRow;
}

export async function fetchMatchPlayers(matchId: string): Promise<MatchPlayerRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('match_players')
    .select()
    .eq('match_id', matchId);

  if (error) {
    console.error('[MatchService] fetchMatchPlayers failed:', error);
    return [];
  }
  return (data ?? []) as MatchPlayerRow[];
}

// ── Ready signal ───────────────────────────────────────────────────────────

export async function signalReady(matchId: string, playerId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('match_players')
    .update({ status: 'ready' })
    .eq('match_id', matchId)
    .eq('player_id', playerId);

  if (error) {
    console.error('[MatchService] signalReady failed:', error);
    return false;
  }

  // Check if both players are ready → start countdown
  const players = await fetchMatchPlayers(matchId);
  const allReady = players.length === 2 && players.every((p) => p.status === 'ready');

  if (allReady) {
    await supabase
      .from('matches')
      .update({ status: 'countdown' })
      .eq('id', matchId);
  }

  return true;
}

// ── Start game (called after countdown elapses) ────────────────────────────

export async function startMatchGame(matchId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('matches')
    .update({ status: 'in_progress', server_start_ts: now })
    .eq('id', matchId);

  if (error) {
    console.error('[MatchService] startMatchGame failed:', error);
    return false;
  }

  await supabase
    .from('match_players')
    .update({ status: 'playing' })
    .eq('match_id', matchId);

  return true;
}

// ── Link session to match player ───────────────────────────────────────────

export async function linkSessionToMatchPlayer(
  matchId: string,
  playerId: string,
  sessionId: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from('match_players')
    .update({ session_id: sessionId })
    .eq('match_id', matchId)
    .eq('player_id', playerId);
}

// ── Submit event decision ──────────────────────────────────────────────────

export async function submitEventMove(
  matchId: string,
  playerId: string,
  slot: MatchPlayerSlot,
  eventKey: string,
  submission: DecisionSubmission,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('match_event_moves')
    .insert({
      match_id: matchId,
      event_key: eventKey,
      player_id: playerId,
      slot,
      public_choice: submission.publicChoice,
      hidden_intent: submission.hiddenIntent,
      used_read_token: submission.useReadToken,
      bluff_action: submission.bluffAction,
    });

  if (error) {
    console.error('[MatchService] submitEventMove failed:', error);
    return false;
  }

  return true;
}

// ── Fetch event moves for an event ────────────────────────────────────────

export async function fetchEventMoves(
  matchId: string,
  eventKey: string,
): Promise<MatchEventMoveRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('match_event_moves')
    .select()
    .eq('match_id', matchId)
    .eq('event_key', eventKey);

  if (error) return [];
  return (data ?? []) as MatchEventMoveRow[];
}

// ── Fetch event outcome ────────────────────────────────────────────────────

export async function fetchEventOutcome(
  matchId: string,
  eventKey: string,
): Promise<MatchEventOutcomeRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('match_event_outcomes')
    .select()
    .eq('match_id', matchId)
    .eq('event_key', eventKey)
    .maybeSingle();

  if (error) return null;
  return data as MatchEventOutcomeRow | null;
}

// ── Complete match ────────────────────────────────────────────────────────

export async function completeMatchPlayer(
  matchId: string,
  playerId: string,
  finalPortfolio: number,
  compositeScore: number,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from('match_players')
    .update({
      status: 'finished',
      final_portfolio: finalPortfolio,
      composite_score: compositeScore,
      finished_at: new Date().toISOString(),
    })
    .eq('match_id', matchId)
    .eq('player_id', playerId);

  // If both finished, mark match as finished
  const players = await fetchMatchPlayers(matchId);
  const allDone = players.length === 2 && players.every((p) => p.status === 'finished');
  if (allDone) {
    await supabase
      .from('matches')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', matchId);
  }
}

// ── Fetch all outcomes for match (for results view) ────────────────────────

export async function fetchMatchOutcomes(matchId: string): Promise<MatchEventOutcomeRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('match_event_outcomes')
    .select()
    .eq('match_id', matchId)
    .order('resolved_at', { ascending: true });

  if (error) return [];
  return (data ?? []) as MatchEventOutcomeRow[];
}

export async function fetchAllMatchMoves(matchId: string): Promise<MatchEventMoveRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('match_event_moves')
    .select()
    .eq('match_id', matchId)
    .order('submitted_at', { ascending: true });

  if (error) return [];
  return (data ?? []) as MatchEventMoveRow[];
}

// ── Realtime subscription ─────────────────────────────────────────────────

type MatchUpdateCallback = (payload: { table: string; new: Record<string, unknown> }) => void;

export function subscribeToMatch(matchId: string, onUpdate: MatchUpdateCallback): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`match:${matchId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
      (payload) => onUpdate({ table: 'matches', new: payload.new as Record<string, unknown> }),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'match_players', filter: `match_id=eq.${matchId}` },
      (payload) => onUpdate({ table: 'match_players', new: payload.new as Record<string, unknown> }),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'match_event_outcomes', filter: `match_id=eq.${matchId}` },
      (payload) => onUpdate({ table: 'match_event_outcomes', new: payload.new as Record<string, unknown> }),
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to match ${matchId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Channel error for match ${matchId}:`, err);
      } else if (status === 'TIMED_OUT') {
        console.error(`[Realtime] Subscription timed out for match ${matchId}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
