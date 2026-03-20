import { useState, useCallback } from "react";
import { Seed, Asset } from "@/lib/types";

interface SeedData {
  seed: Seed;
  assets: Asset[];
  prices: Record<string, number[]>; // assetId → price array indexed from 0
  dates: string[]; // ISO date strings aligned to price indices
}

export function useSeedData() {
  const [seedData, setSeedData] = useState<SeedData | null>(null);
  const [availableSeeds, setAvailableSeeds] = useState<Seed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeeds = useCallback(async () => {
    const res = await fetch("/api/seeds");
    const data = await res.json();
    setAvailableSeeds(data);
    return data as Seed[];
  }, []);

  const fetchSeedData = useCallback(async (seedId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/seeds/${seedId}/prices`);
      if (!res.ok) throw new Error("Failed to fetch seed data");
      const data: SeedData = await res.json();
      setSeedData(data);
      return data;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    seedData,
    availableSeeds,
    loading,
    error,
    fetchSeeds,
    fetchSeedData,
  };
}
