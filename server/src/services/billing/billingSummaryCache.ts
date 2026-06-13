import { getRedis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { redisKeys } from '../../shared/redis/keys.js';

export async function invalidateSubscriptionSummary(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(redisKeys.billing.subscriptionSummary(userId));
  } catch {
    // ignore
  }
}

export async function getCachedSubscriptionSummary(userId: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(redisKeys.billing.subscriptionSummary(userId));
  } catch {
    return null;
  }
}

export async function setCachedSubscriptionSummary(userId: string, json: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const ttl = env.BILLING_SUMMARY_CACHE_TTL_SEC;
  try {
    await redis.set(redisKeys.billing.subscriptionSummary(userId), json, { EX: ttl });
  } catch {
    // ignore
  }
}
