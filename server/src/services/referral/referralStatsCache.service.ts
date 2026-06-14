import { getRedis, isRedisAvailable } from "../../config/redis.js";
import { redisKeys } from "../../shared/redis/keys.js";
import { getReferralStatsCounts } from "./referralConversion.service.js";
import { REFERRAL_STATS_CACHE_TTL_SEC } from "../../variable/constants.js";
const LEADERBOARD_MAX = 500;
export type ReferralUserStatsCache = {
  converted: number;
  pending: number;
  rewarded: number;
};
export async function invalidateReferralUserStatsCache(
  userId: string,
): Promise<void> {
  if (!isRedisAvailable()) return;
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(redisKeys.invite.userStats(userId));
  } catch {}
}
export async function getReferralUserStatsCached(
  userId: string,
): Promise<ReferralUserStatsCache> {
  if (isRedisAvailable()) {
    const redis = getRedis();
    if (redis) {
      try {
        const raw = await redis.get(redisKeys.invite.userStats(userId));
        if (raw) {
          return JSON.parse(raw) as ReferralUserStatsCache;
        }
      } catch {}
    }
  }
  const counts = await getReferralStatsCounts(userId);
  const payload: ReferralUserStatsCache = {
    converted: counts.converted,
    pending: counts.pending,
    rewarded: counts.rewarded,
  };
  if (isRedisAvailable()) {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.setEx(
          redisKeys.invite.userStats(userId),
          REFERRAL_STATS_CACHE_TTL_SEC,
          JSON.stringify(payload),
        );
      } catch {}
    }
  }
  return payload;
}
export async function addReferralLeaderboardScore(
  referrerId: string,
  delta = 1,
): Promise<void> {
  if (!isRedisAvailable() || delta <= 0) return;
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.zIncrBy(redisKeys.invite.leaderboard, delta, referrerId);
    await redis.zRemRangeByRank(
      redisKeys.invite.leaderboard,
      0,
      -(LEADERBOARD_MAX + 1),
    );
  } catch (e) {
    console.warn("[referral-leaderboard]", String(e));
  }
}
export type ReferralLeaderboardEntry = {
  userId: string;
  score: number;
  rank: number;
};
export async function getReferralLeaderboardTop(
  limit = 20,
): Promise<ReferralLeaderboardEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  const n = Math.min(Math.max(limit, 1), 100);
  try {
    const rows = await redis.zRangeWithScores(
      redisKeys.invite.leaderboard,
      0,
      n - 1,
      {
        REV: true,
      },
    );
    return rows.map((row, i) => ({
      userId: row.value,
      score: row.score,
      rank: i + 1,
    }));
  } catch {
    return [];
  }
}
