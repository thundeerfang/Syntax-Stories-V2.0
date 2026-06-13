import { getRedis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { redisKeys } from '../../shared/redis/keys.js';

export async function consumeSearchRateLimit(ip: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;

  const minute = Math.floor(Date.now() / 60_000);
  const key = redisKeys.search.rateLimit(ip, minute);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 90);
  }
  return count <= env.SEARCH_RATE_LIMIT_PER_MIN;
}
