import mongoose from 'mongoose';
import type { AchievementEvent, AchievementUnlockDto } from '../../achievements/achievement.types.js';
import { env } from '../../config/env.js';
import { isRedisAvailable } from '../../config/redis.js';
import { AchievementEventLogModel } from '../../models/AchievementEventLog.js';
import { enqueueAchievementGamificationOutbox } from '../gamification/gamificationOutbox.service.js';
import {
  attachAchievementsToResponse,
  processAchievementEvents,
} from './achievementEngine.service.js';

export type AchievementDispatchContext = {
  source?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
};

async function logAchievementEvents(
  userId: string,
  events: AchievementEvent[],
  ctx?: AchievementDispatchContext
): Promise<void> {
  if (events.length === 0) return;
  try {
    await AchievementEventLogModel.insertMany(
      events.map((e) => ({
        userId: new mongoose.Types.ObjectId(userId),
        event: e.type,
        source: ctx?.source,
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
        sessionId: ctx?.sessionId,
      }))
    );
  } catch {
    /* non-fatal */
  }
}

async function enqueueOutbox(
  userId: string,
  events: AchievementEvent[],
  ctx?: AchievementDispatchContext
): Promise<void> {
  await enqueueAchievementGamificationOutbox(userId, events, ctx);
}

/**
 * Single entry for controllers: sync evaluation or async outbox + worker.
 * When ACHIEVEMENT_ASYNC=1 and Redis is up, returns [] (unlocks via SSE notifications).
 */
export async function dispatchAchievementEvents(
  userId: string,
  events: AchievementEvent[],
  ctx?: AchievementDispatchContext
): Promise<AchievementUnlockDto[]> {
  if (!userId || events.length === 0) return [];

  void logAchievementEvents(userId, events, ctx);

  const useAsync = env.ACHIEVEMENT_ASYNC && isRedisAvailable();
  if (useAsync) {
    await enqueueOutbox(userId, events, ctx);
    return [];
  }

  return processAchievementEvents(userId, events, {
    sourceEvent: events.map((e) => e.type).join(','),
  });
}

export { attachAchievementsToResponse };
