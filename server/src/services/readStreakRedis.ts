import type { Types } from "mongoose";
import { createClient } from "redis";
import { redisKeys } from "../shared/redis/keys.js";
import {
  assertTodayIsNextUtcDayAfterYesterday,
  previousUtcCalendarDay,
  streakUtcDayBucket,
} from "../streak/calendarUtc.js";
import { evalApplyDailyStreakHash } from "../streak/evalApplyDailyStreakHash.js";
import {
  computeUnanchoredDailyStreakHashFields,
  getMaxDayBucketForReader,
  loadUtcReadDayMidnightsForReader,
} from "./readStreak.service.js";
import {
  readDayZsetScoreMs,
  readDaysTrimMinRetainMsUtc,
  readDaysZsetTrimExclusiveMaxArg,
} from "./readStreakZset.js";
type RedisClient = ReturnType<typeof createClient>;
function streakDailyKey(readerId: Types.ObjectId): string {
  return redisKeys.readStreak.dailyHash(String(readerId));
}
function readDaysKey(readerId: Types.ObjectId): string {
  return redisKeys.readStreak.readDaysZset(String(readerId));
}
async function rebuildDailyStreakHashFromMongo(
  redis: RedisClient,
  key: string,
  readerId: Types.ObjectId,
  now: Date,
): Promise<void> {
  const dates = await loadUtcReadDayMidnightsForReader(readerId);
  const state = computeUnanchoredDailyStreakHashFields(dates, now);
  if (!state.lastDay) {
    await redis.del(key);
    return;
  }
  await redis.hSet(key, {
    current: String(state.current),
    longest: String(state.longest),
    lastDay: state.lastDay,
  });
}
function sortedUniqueDayBucketsFromDates(
  dates: readonly Date[],
  now: Date,
): string[] {
  const todayB = streakUtcDayBucket(now);
  const set = new Set<string>();
  for (const d of dates) {
    const b = streakUtcDayBucket(d);
    if (b <= todayB) set.add(b);
  }
  return [...set].sort();
}
export async function reconcileReaderReadStreakRedis(
  redis: RedisClient,
  readerId: Types.ObjectId,
  now = new Date(),
): Promise<void> {
  const hashKey = streakDailyKey(readerId);
  const zKey = readDaysKey(readerId);
  await rebuildReadDaysZsetFromMongo(redis, zKey, readerId, now);
  await rebuildDailyStreakHashFromMongo(redis, hashKey, readerId, now);
}
async function rebuildReadDaysZsetFromMongo(
  redis: RedisClient,
  zKey: string,
  readerId: Types.ObjectId,
  now: Date,
): Promise<void> {
  const dates = await loadUtcReadDayMidnightsForReader(readerId);
  const buckets = sortedUniqueDayBucketsFromDates(dates, now);
  const trimMin = readDaysTrimMinRetainMsUtc(now);
  const trimMax = readDaysZsetTrimExclusiveMaxArg(trimMin);
  const chain = redis.multi();
  chain.del(zKey);
  for (const b of buckets) {
    chain.zAdd(zKey, { score: readDayZsetScoreMs(b), value: b });
  }
  chain.zRemRangeByScore(zKey, "-inf", trimMax);
  await chain.exec();
}
async function appendReadDayZsetNxAndTrim(
  redis: RedisClient,
  zKey: string,
  dayBucket: string,
  now: Date,
): Promise<void> {
  const score = readDayZsetScoreMs(dayBucket);
  await redis.zAdd(zKey, [{ score, value: dayBucket }], { NX: true });
  const trimMax = readDaysZsetTrimExclusiveMaxArg(
    readDaysTrimMinRetainMsUtc(now),
  );
  await redis.zRemRangeByScore(zKey, "-inf", trimMax);
}
export async function syncReadStreakRedisAfterMongoUpsert(params: {
  redis: RedisClient;
  readerId: Types.ObjectId;
  dayBucket: string;
  now: Date;
}): Promise<void> {
  const { redis, readerId, dayBucket, now } = params;
  const hashKey = streakDailyKey(readerId);
  const zKey = readDaysKey(readerId);
  const mongoMax = await getMaxDayBucketForReader(readerId);
  if (!mongoMax) return;
  const redisLastRaw = await redis.hGet(hashKey, "lastDay");
  const redisLast = redisLastRaw ? redisLastRaw : null;
  if (redisLast && dayBucket < redisLast) {
    console.error("[read-streak] STREAK_MONOTONICITY_BROKEN", {
      readerId: String(readerId),
      dayBucket,
      redisLast,
    });
    return;
  }
  const needsFullRebuild = !redisLast || redisLast < mongoMax;
  if (needsFullRebuild) {
    await rebuildReadDaysZsetFromMongo(redis, zKey, readerId, now);
    await rebuildDailyStreakHashFromMongo(redis, hashKey, readerId, now);
    return;
  }
  await appendReadDayZsetNxAndTrim(redis, zKey, dayBucket, now);
  if (redisLast === dayBucket) {
    return;
  }
  const yesterday = previousUtcCalendarDay(dayBucket);
  assertTodayIsNextUtcDayAfterYesterday(dayBucket, yesterday);
  await evalApplyDailyStreakHash(redis, hashKey, dayBucket, yesterday);
}
