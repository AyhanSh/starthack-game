import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Fetch seed
    const { data: seed, error: seedError } = await supabase
      .from("seeds")
      .select("*")
      .eq("id", id)
      .single();

    if (seedError || !seed) {
      return NextResponse.json({ error: "Seed not found" }, { status: 404 });
    }

    // Fetch seed_assets to know which assets are in this seed
    const { data: seedAssets, error: saError } = await supabase
      .from("seed_assets")
      .select("asset_id")
      .eq("seed_id", id);

    if (saError) throw saError;

    const assetIds = (seedAssets ?? []).map((sa: { asset_id: string }) => sa.asset_id);

    // Fetch asset details
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("*")
      .in("id", assetIds);

    if (assetsError) throw assetsError;

    // Fetch all weekly prices for the seed window
    const { data: weeklyPrices, error: pricesError } = await supabase
      .from("weekly_prices")
      .select("asset_id, week_index, date, price")
      .gte("week_index", seed.start_week)
      .lte("week_index", seed.end_week)
      .in("asset_id", assetIds)
      .order("asset_id")
      .order("week_index");

    if (pricesError) throw pricesError;

    // Group prices by asset_id, reindex from 0
    const prices: Record<string, number[]> = {};
    const datesSet: Map<number, string> = new Map();

    for (const row of weeklyPrices ?? []) {
      const idx = row.week_index - seed.start_week;
      if (!prices[row.asset_id]) prices[row.asset_id] = [];
      prices[row.asset_id][idx] = row.price;
      if (!datesSet.has(idx)) datesSet.set(idx, row.date);
    }

    const totalWeeks = seed.end_week - seed.start_week + 1;
    const dates: string[] = Array.from({ length: totalWeeks }, (_, i) => datesSet.get(i) ?? "");

    return NextResponse.json({ seed, assets, prices, dates });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
