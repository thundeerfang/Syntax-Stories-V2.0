"use client";
import { useEffect, useRef } from "react";
import { achievementsStreamUrl } from "@/api/achievements";
import { consumeAchievementStream } from "@/lib/achievements/achievementStream";
import { celebrateAchievements } from "@/store/achievementCelebration";
import { useAuthStore } from "@/store/auth";
export function AchievementRealtimeBridge() {
  const token = useAuthStore((s) => s.token);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    abortRef.current?.abort();
    if (!token) return undefined;
    const ac = new AbortController();
    abortRef.current = ac;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const connect = () => {
      if (cancelled) return;
      void consumeAchievementStream(
        achievementsStreamUrl(),
        token,
        (event) => {
          if (event.type === "unlock" && event.payload?.unlocks?.length) {
            celebrateAchievements(event.payload.unlocks);
          }
        },
        ac.signal,
      ).catch(() => {
        if (cancelled || ac.signal.aborted) return;
        retryTimer = setTimeout(connect, 5000);
      });
    };
    connect();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      ac.abort();
    };
  }, [token]);
  return null;
}
