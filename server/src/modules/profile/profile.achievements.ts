import type {
  AchievementEvent,
  AchievementMetric,
} from "../../achievements/achievement.types.js";

const PROFILE_FIELD_METRICS: Record<string, AchievementMetric> = {
  bio: "profile.has_bio",
  profileImg: "profile.has_avatar",
  coverBanner: "profile.has_cover",
  github: "profile.has_github",
  stackAndTools: "stack.tools.count",
  mySetup: "profile.setup.count",
  profileLocation: "profile.has_location",
};

export function profileAchievementEventsForUpdates(
  updates: Record<string, unknown>,
): AchievementEvent[] {
  const metrics = new Set<AchievementMetric>();
  for (const key of Object.keys(updates)) {
    const metric = PROFILE_FIELD_METRICS[key];
    if (metric) metrics.add(metric);
  }
  if (metrics.size === 0) return [];
  return [{ type: "profile_sync", metrics: [...metrics] }];
}
