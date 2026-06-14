import type {
  AchievementEvent,
  AchievementUnlockDto,
} from "../../achievements/achievement.types.js";
import { env } from "../../config/env.js";
import { isRedisAvailable } from "../../config/redis.js";
import { writeAchievementEventLogs } from "../../shared/audit/auditLog.js";
import { enqueueAchievementGamificationOutbox } from "../gamification/gamificationOutbox.service.js";
import {
  attachAchievementsToResponse,
  processAchievementEvents,
} from "./achievementEngine.service.js";
export type AchievementDispatchContext = {
  source?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
};
async function logAchievementEvents(
  userId: string,
  events: AchievementEvent[],
  ctx?: AchievementDispatchContext,
): Promise<void> {
  void writeAchievementEventLogs(
    userId,
    events.map((e) => e.type),
    ctx,
  );
}
async function enqueueOutbox(
  userId: string,
  events: AchievementEvent[],
  ctx?: AchievementDispatchContext,
): Promise<void> {
  await enqueueAchievementGamificationOutbox(userId, events, ctx);
}
export async function dispatchAchievementEvents(
  userId: string,
  events: AchievementEvent[],
  ctx?: AchievementDispatchContext,
): Promise<AchievementUnlockDto[]> {
  if (!userId || events.length === 0) return [];
  void logAchievementEvents(userId, events, ctx);
  const useAsync = env.ACHIEVEMENT_ASYNC && isRedisAvailable();
  if (useAsync) {
    await enqueueOutbox(userId, events, ctx);
    return [];
  }
  return processAchievementEvents(userId, events, {
    sourceEvent: events.map((e) => e.type).join(","),
  });
}
export { attachAchievementsToResponse };
