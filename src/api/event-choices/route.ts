import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { sessionId, eventKey, chain, chosen, portfolioAtChoice } =
      await request.json();
    const supabase = createServerClient();

    const { error } = await supabase.from("event_choices").insert({
      session_id: sessionId,
      event_key: eventKey,
      chain,
      chosen,
      portfolio_at_choice: portfolioAtChoice,
    });

    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
