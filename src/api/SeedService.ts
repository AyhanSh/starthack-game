import { getSupabase } from './supabase';
import type { Seed, Asset, SeedData } from '../types';

export async function fetchSeeds(): Promise<Seed[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('seeds')
    .select('id, name, difficulty, description, reveal_title, reveal_text, historical_events, crash_weeks, start_week, end_week, total_weeks, start_date, end_date')
    .order('difficulty', { ascending: true });

  if (error) {
    console.error('[SeedService] fetchSeeds failed:', error);
    return [];
  }

  const order: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  return (data ?? []).sort(
    (a, b) => (order[a.difficulty] ?? 0) - (order[b.difficulty] ?? 0),
  ) as Seed[];
}

export async function fetchSeedData(seedId: string): Promise<SeedData | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  // Fetch seed
  const { data: seed, error: seedErr } = await supabase
    .from('seeds')
    .select('*')
    .eq('id', seedId)
    .single();

  if (seedErr || !seed) {
    console.error('[SeedService] fetchSeed failed:', seedErr);
    return null;
  }

  // Fetch assets for this seed
  const { data: seedAssets, error: saErr } = await supabase
    .from('seed_assets')
    .select('asset_id')
    .eq('seed_id', seedId);

  if (saErr) {
    console.error('[SeedService] fetchSeedAssets failed:', saErr);
    return null;
  }

  const assetIds = (seedAssets ?? []).map((sa: { asset_id: string }) => sa.asset_id);

  // Fetch asset metadata
  const { data: assets, error: assetErr } = await supabase
    .from('assets')
    .select('*')
    .in('id', assetIds);

  if (assetErr) {
    console.error('[SeedService] fetchAssets failed:', assetErr);
    return null;
  }

  // Fetch weekly prices for this seed's range
  const startWeek = seed.start_week ?? 0;
  const endWeek = seed.end_week ?? 520;

  const { data: priceRows, error: priceErr } = await supabase
    .from('weekly_prices')
    .select('asset_id, week_index, date, price')
    .in('asset_id', assetIds)
    .gte('week_index', startWeek)
    .lte('week_index', endWeek)
    .order('week_index', { ascending: true });

  if (priceErr) {
    console.error('[SeedService] fetchPrices failed:', priceErr);
    return null;
  }

  // Transform prices into Record<assetId, number[]>
  const prices: Record<string, number[]> = {};
  const dateSet = new Set<string>();

  for (const row of priceRows ?? []) {
    if (!prices[row.asset_id]) {
      prices[row.asset_id] = [];
    }
    const relativeIndex = row.week_index - startWeek;
    prices[row.asset_id][relativeIndex] = row.price;
    if (row.date) dateSet.add(row.date);
  }

  const dates = Array.from(dateSet).sort();

  return {
    seed: seed as Seed,
    assets: (assets ?? []) as Asset[],
    prices,
    dates,
  };
}
