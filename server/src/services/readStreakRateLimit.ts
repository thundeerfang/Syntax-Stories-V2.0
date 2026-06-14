import { createClient } from "redis";
import { redisKeys } from "../shared/redis/keys.js";
import { READ_VIEW_START_MAX_PER_MINUTE } from "../variable/constants.js";
type RedisClient = ReturnType<typeof createClient>;
export { READ_VIEW_START_MAX_PER_MINUTE };
export async function consumeReadViewStartRateLimit(
  redis: RedisClient,
  userId: string,
  nowMs = Date.now(),
): Promise<boolean> {
  const minuteEpoch = Math.floor(nowMs / 60000);
  const key = redisKeys.readStreak.viewStartRateLimit(userId, minuteEpoch);
  const n = await redis.incr(key);
  if (n === 1) {
    await redis.expire(key, 90);
  }
  return n <= READ_VIEW_START_MAX_PER_MINUTE;
}
