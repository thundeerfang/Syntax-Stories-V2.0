import type { IUserAchievementProgress } from "../models/UserAchievementProgress.js";
import type { MetricSnapshot } from "./achievement.types.js";
import {
  getOrCreateUserStats,
  syncUserStatsFromSources,
  userStatsToMetricSnapshot,
} from "../services/achievements/userStats.service.js";
export type { MetricSnapshot } from "./achievement.types.js";
export async function buildMetricSnapshot(
  userId: string,
  _progress?: IUserAchievementProgress,
): Promise<MetricSnapshot> {
  const stats = await getOrCreateUserStats(userId);
  await syncUserStatsFromSources(userId, stats);
  return userStatsToMetricSnapshot(stats);
}
export function isProfileCoreComplete(snapshot: MetricSnapshot): boolean {
  return (
    snapshot["profile.has_avatar"] >= 1 && snapshot["profile.has_bio"] >= 1
  );
}
