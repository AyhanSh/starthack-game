import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const eventKey = decodeURIComponent(key);
    const supabase = createServerClient();

    const { data } = await supabase
      .from("event_choice_stats")
      .select("*")
      .eq("event_key", eventKey)
      .single();

    if (!data || data.total_choices === 0) {
      return NextResponse.json({ total: 0, optionAPct: 50, optionBPct: 50 });
    }

    const total = data.total_choices;
    const optionAPct = Math.round((data.option_a_count / total) * 100);
    const optionBPct = 100 - optionAPct;

    return NextResponse.json({ total, optionAPct, optionBPct });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
