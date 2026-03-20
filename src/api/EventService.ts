import { getSupabase } from './supabase';
import type { EventChoiceStats } from '../types';

export async function fetchEventStats(eventKey: string): Promise<EventChoiceStats | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('event_choice_stats')
    .select('*')
    .eq('event_key', eventKey)
    .maybeSingle();

  if (error) {
    console.warn('[EventService] fetchEventStats failed:', error);
    return null;
  }
  
  return data as EventChoiceStats | null;
}

export async function recordEventChoice(
  sessionId: string,
  eventKey: string,
  chain: string,
  chosen: 'a' | 'b',
  portfolioAtChoice: number,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  // Fire and forget — don't block gameplay
  supabase
    .from('event_choices')
    .insert({
      session_id: sessionId,
      event_key: eventKey,
      chain,
      chosen,
      portfolio_at_choice: portfolioAtChoice,
    })
    .then(({ error }) => {
      if (error) console.error('[EventService] recordEventChoice failed:', error);
    });
}
