import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';

const HOUR_MS = 3_600_000;
const UPTIME_LOOKBACK_HOURS = 30 * 24;
const UPTIME_BUCKET_TTL_SEC = 90 * 24 * 3600;

function hourBucket(d = new Date()): string {
  return d.toISOString().slice(0, 13);
}

/** Record a successful API heartbeat for rolling uptime windows. */
export async function recordPlatformHealthCheck(ok = true): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = redisKeys.platform.uptimeHour(hourBucket());
  const field = ok ? 'ok' : 'fail';
  await redis.hIncrBy(key, field, 1);
  await redis.expire(key, UPTIME_BUCKET_TTL_SEC);
}

export async function getUptimePercent(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 100;

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < UPTIME_LOOKBACK_HOURS; i += 1) {
    const d = new Date(Date.now() - i * HOUR_MS);
    const key = redisKeys.platform.uptimeHour(hourBucket(d));
    const bucket = await redis.hGetAll(key);
    ok += Number(bucket.ok ?? 0);
    fail += Number(bucket.fail ?? 0);
  }

  const total = ok + fail;
  if (total === 0) return 100;
  return Math.min(100, Math.round((ok / total) * 1000) / 10);
}
