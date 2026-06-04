import { getRedis, isRedisAvailable } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';

const LEADERBOARD_MAX = 500;

export async function addLeaderboardScore(userId: string, score: number): Promise<void> {
  if (!isRedisAvailable() || score <= 0) return;
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.zIncrBy(redisKeys.achievements.leaderboardPoints, score, userId);
    await redis.zRemRangeByRank(
      redisKeys.achievements.leaderboardPoints,
      0,
      -(LEADERBOARD_MAX + 1)
    );
  } catch (e) {
    console.warn('[achievement-leaderboard]', String(e));
  }
}

export type LeaderboardEntry = { userId: string; score: number; rank: number };

export async function getLeaderboardTop(limit = 20): Promise<LeaderboardEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  const n = Math.min(Math.max(limit, 1), 100);
  try {
    const rows = await redis.zRangeWithScores(redisKeys.achievements.leaderboardPoints, 0, n - 1, {
      REV: true,
    });
    return rows.map((row, i) => ({
      userId: row.value,
      score: row.score,
      rank: i + 1,
    }));
  } catch {
    return [];
  }
}

export async function getLeaderboardRank(userId: string): Promise<{ rank: number; score: number } | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const score = await redis.zScore(redisKeys.achievements.leaderboardPoints, userId);
    if (score == null) return null;
    const rank = await redis.zRevRank(redisKeys.achievements.leaderboardPoints, userId);
    return { rank: rank != null ? rank + 1 : 0, score };
  } catch {
    return null;
  }
}
