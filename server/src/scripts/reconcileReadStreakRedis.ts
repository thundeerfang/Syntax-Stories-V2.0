import mongoose from 'mongoose';
import { createClient } from 'redis';
import { env } from '../config/env.js';
import { BlogReadDayModel } from '../models/BlogReadDay.js';
import { incrementReadStreakMetric } from '../services/readStreakMetrics.js';
import { reconcileReaderReadStreakRedis } from '../services/readStreakRedis.js';

/**
 * Rebuild `user:{id}:readDays` + `user:{id}:streak:daily` from Mongo for every distinct reader (§31).
 *
 * Usage:
 *   REDIS_URL=... MONGO_CONN=... npx tsx src/scripts/reconcileReadStreakRedis.ts
 *
 * Optional: READ_STREAK_RECONCILE_MAX=N — process at most N readers (smoke test).
 */
async function main() {
  const uri = env.MONGODB_URI;
  const redisUrl = env.REDIS_URL;
  if (!uri) throw new Error('MONGO_CONN / MONGODB_URI is required');
  if (!redisUrl) throw new Error('REDIS_URL is required');

  const maxRaw = process.env.READ_STREAK_RECONCILE_MAX;
  const max = maxRaw ? Number.parseInt(maxRaw, 10) : undefined;
  if (maxRaw != null && (Number.isNaN(max!) || max! < 0)) {
    throw new Error('READ_STREAK_RECONCILE_MAX must be a non-negative integer');
  }

  await mongoose.connect(uri);
  const redis = createClient({ url: redisUrl });
  await redis.connect();
  console.log('[read-streak reconcile] connected');

  const readerIds = await BlogReadDayModel.distinct('readerId', {});
  const now = new Date();
  let n = 0;
  for (const rid of readerIds) {
    if (max != null && n >= max) break;
    await reconcileReaderReadStreakRedis(redis, rid as mongoose.Types.ObjectId, now);
    n += 1;
    if (n % 500 === 0) console.log(`[read-streak reconcile] ${n} readers`);
  }

  incrementReadStreakMetric('readStreakReconcileUsers', n);
  console.log(`[read-streak reconcile] done. readers=${n}`);
  await redis.quit();
  await mongoose.disconnect();
}

try {
  await main();
} catch (err) {
  console.error('[read-streak reconcile] failed', err);
  process.exit(1);
}
