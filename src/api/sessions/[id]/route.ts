import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const {
      finalPortfolio,
      benchmarkFinal,
      behavioralProfile,
      compositeScore,
      totalRebalances,
      panicRebalances,
      cashHeavyWeeks,
      maxDrawdownPct,
      chainState,
      durationSeconds,
      snapshots,
    } = await request.json();

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("game_sessions")
      .update({
        final_portfolio: finalPortfolio,
        benchmark_final: benchmarkFinal,
        behavioral_profile: behavioralProfile,
        composite_score: compositeScore,
        total_rebalances: totalRebalances,
        panic_rebalances: panicRebalances,
        cash_heavy_weeks: cashHeavyWeeks,
        max_drawdown_pct: maxDrawdownPct,
        chain_state: chainState,
        duration_seconds: durationSeconds,
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (snapshots && snapshots.length > 0) {
      const snapshotRows = snapshots.map((s: Record<string, unknown>) => ({
        ...s,
        session_id: id,
      }));
      const { error: snapshotError } = await supabase
        .from("portfolio_snapshots")
        .insert(snapshotRows);
      if (snapshotError) throw snapshotError;
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
