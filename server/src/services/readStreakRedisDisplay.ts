import type { Types } from "mongoose";
import { createClient } from "redis";
import { redisKeys } from "../shared/redis/keys.js";
import {
  previousUtcCalendarDay,
  streakUtcDayBucket,
} from "../streak/calendarUtc.js";
type RedisClient = ReturnType<typeof createClient>;
export type AnchoredDailyDisplay = {
  current: number;
  longest: number;
};
export function anchorDailyStreakDisplayFromHash(
  lastDay: string,
  currentUnanchored: number,
  longestUnanchored: number,
  now: Date,
): AnchoredDailyDisplay | null {
  if (!lastDay || !/^\d{4}-\d{2}-\d{2}$/.test(lastDay)) return null;
  const todayB = streakUtcDayBucket(now);
  const yesterdayB = previousUtcCalendarDay(todayB);
  let current = currentUnanchored;
  if (lastDay < yesterdayB) {
    current = 0;
  } else if (lastDay !== todayB && lastDay !== yesterdayB) {
    current = 0;
  }
  return { current, longest: longestUnanchored };
}
export async function tryAnchoredDailyReadStreakFromRedis(
  redis: RedisClient,
  readerId: Types.ObjectId,
  mongoMaxDayBucket: string | null,
  now = new Date(),
): Promise<AnchoredDailyDisplay | null> {
  const hashKey = redisKeys.readStreak.dailyHash(String(readerId));
  const [lastDayRaw, curRaw, lngRaw] = await Promise.all([
    redis.hGet(hashKey, "lastDay"),
    redis.hGet(hashKey, "current"),
    redis.hGet(hashKey, "longest"),
  ]);
  const lastDay = lastDayRaw ? lastDayRaw : "";
  if (!lastDay) return null;
  if (mongoMaxDayBucket && lastDay < mongoMaxDayBucket) {
    return null;
  }
  const currentU = Number(curRaw) || 0;
  const longestU = Number(lngRaw) || 0;
  return anchorDailyStreakDisplayFromHash(lastDay, currentU, longestU, now);
}
