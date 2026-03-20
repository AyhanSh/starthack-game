import { getSupabase } from './supabase';
import type { Player } from '../types';

function getDeviceId(): string {
  let deviceId = localStorage.getItem('wma_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('wma_device_id', deviceId);
  }
  return deviceId;
}

export async function createPlayer(nickname: string, avatar: string): Promise<Player | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const deviceId = getDeviceId();

  const { data, error } = await supabase
    .from('players')
    .upsert({ device_id: deviceId, nickname, avatar }, { onConflict: 'device_id' })
    .select()
    .single();

  if (error) {
    console.error('[PlayerService] createPlayer failed:', error);
    return null;
  }

  return data as Player;
}

export async function getPlayer(): Promise<Player | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const deviceId = localStorage.getItem('wma_device_id');
  if (!deviceId) return null;

  const { data, error } = await supabase
    .from('players')
    .select()
    .eq('device_id', deviceId)
    .single();

  if (error) return null;
  return data as Player;
}
