import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("seeds")
      .select("id, name, difficulty, description, reveal_title")
      .order("difficulty", { ascending: true });

    if (error) throw error;

    // Sort by difficulty: easy, medium, hard
    const order = { easy: 0, medium: 1, hard: 2 };
    const sorted = (data ?? []).sort(
      (a, b) =>
        (order[a.difficulty as keyof typeof order] ?? 0) -
        (order[b.difficulty as keyof typeof order] ?? 0)
    );

    return NextResponse.json(sorted);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
