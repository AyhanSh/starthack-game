import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { playerId, seedId, startingPortfolio, monthlyContribution } =
      await request.json();
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("game_sessions")
      .insert({
        player_id: playerId,
        seed_id: seedId,
        starting_portfolio: startingPortfolio,
        monthly_contribution: monthlyContribution,
        completed: false,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
