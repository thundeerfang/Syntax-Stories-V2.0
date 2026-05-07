import { createClient } from 'redis';
import { APPLY_DAILY_STREAK_HASH_LUA } from './applyDailyStreakHashLua.js';

type RedisClient = ReturnType<typeof createClient>;

export type EvalDailyStreakHashResult = {
  applied: boolean;
  current: number;
  longest: number;
  lastDay: string;
};

function coerceEvalRow(raw: unknown): EvalDailyStreakHashResult {
  if (!Array.isArray(raw) || raw.length < 4) {
    throw new Error('applyDailyStreakHash: unexpected EVAL return shape');
  }
  const [appliedRaw, currentRaw, longestRaw, lastDayRaw] = raw;
  return {
    applied: Number(appliedRaw) === 1,
    current: Number(currentRaw),
    longest: Number(longestRaw),
    lastDay: String(lastDayRaw),
  };
}

/** Run HASH-only streak transition via Redis `EVAL` (same semantics as `applyDailyStreakTransition`). */
export async function evalApplyDailyStreakHash(
  client: RedisClient,
  streakKey: string,
  today: string,
  yesterday: string
): Promise<EvalDailyStreakHashResult> {
  const raw = await client.eval(APPLY_DAILY_STREAK_HASH_LUA, {
    keys: [streakKey],
    arguments: [today, yesterday],
  });
  return coerceEvalRow(raw);
}
