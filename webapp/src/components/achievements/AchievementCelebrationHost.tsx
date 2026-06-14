"use client";
import { useCallback } from "react";
import { useAchievementCelebrationStore } from "@/store/achievementCelebration";
import { AchievementUnlockDialog } from "./AchievementUnlockDialog";
export function AchievementCelebrationHost() {
  const active = useAchievementCelebrationStore((s) => s.active);
  const dismissActive = useAchievementCelebrationStore((s) => s.dismissActive);
  const onClose = useCallback(() => {
    dismissActive();
  }, [dismissActive]);
  return <AchievementUnlockDialog unlock={active} onClose={onClose} />;
}
