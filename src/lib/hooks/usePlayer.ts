import { useState, useEffect, useCallback } from "react";
import { Player } from "@/lib/types";

// Generate a UUID v4
function generateDeviceId(): string {
  return crypto.randomUUID();
}

export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check localStorage for existing device ID
  useEffect(() => {
    const existingDeviceId = localStorage.getItem("wma_device_id");
    if (existingDeviceId) {
      // Try to fetch existing player
      fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: existingDeviceId,
          nickname: "",
          avatar: "",
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.id) setPlayer(data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Create a new player (called from onboarding)
  const createPlayer = useCallback(async (nickname: string, avatar: string) => {
    let deviceId = localStorage.getItem("wma_device_id");
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem("wma_device_id", deviceId);
    }
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, nickname, avatar }),
    });
    const data = await res.json();
    setPlayer(data);
    return data as Player;
  }, []);

  return { player, loading, createPlayer };
}
