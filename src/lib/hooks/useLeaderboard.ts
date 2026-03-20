import { useState, useCallback } from "react";
import { LeaderboardEntry } from "@/lib/types";

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = useCallback(async (seedId?: string, limit = 50) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (seedId) params.set("seed", seedId);
      params.set("limit", String(limit));
      const res = await fetch(`/api/leaderboard?${params}`);
      const data = await res.json();
      setEntries(data);
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { entries, loading, fetchLeaderboard };
}
