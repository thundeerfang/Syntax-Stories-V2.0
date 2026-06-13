import type { AchievementsPayload } from '@/contracts/achievementsApi';
import { celebrateAchievements } from '@/store/achievementCelebration';

export function handleAchievementsResponse(
  body: { achievements?: AchievementsPayload } | null | undefined
): void {
  const unlocks = body?.achievements?.newlyUnlocked;
  celebrateAchievements(unlocks);
}
