import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const seed = searchParams.get("seed");

    const supabase = createServerClient();

    let query = supabase.from("leaderboard").select("*").limit(limit);

    if (seed) {
      query = query.eq("seed_id", seed);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
