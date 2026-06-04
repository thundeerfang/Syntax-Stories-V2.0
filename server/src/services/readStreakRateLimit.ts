import { createClient } from 'redis';
import { redisKeys } from '../shared/redis/keys.js';

type RedisClient = ReturnType<typeof createClient>;

/** Max VIEW_START calls per user per rolling minute (F.2). */
export const READ_VIEW_START_MAX_PER_MINUTE = 30;

/**
 * Redis INCR + EXPIRE rate limit. Returns `false` when limit exceeded.
 */
export async function consumeReadViewStartRateLimit(
  redis: RedisClient,
  userId: string,
  nowMs = Date.now()
): Promise<boolean> {
  const minuteEpoch = Math.floor(nowMs / 60_000);
  const key = redisKeys.readStreak.viewStartRateLimit(userId, minuteEpoch);
  const n = await redis.incr(key);
  if (n === 1) {
    await redis.expire(key, 90);
  }
  return n <= READ_VIEW_START_MAX_PER_MINUTE;
}
