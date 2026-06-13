import mongoose from 'mongoose';
import { createClient } from 'redis';
import { MS_PER_DAY } from '../constants/durations.js';
import { BlogReadDayModel } from '../models/BlogReadDay.js';
import { DAY_BUCKET_RE, READ_HEATMAP_WINDOW_DAYS } from '../variable/constants.js';
import { recomputeDailyStreakFromSortedDays } from '../streak/applyDailyStreakTransition.js';
import {
  previousUtcCalendarDay,
  streakUtcDayBucket,
  utcMidnightFromDayBucket,
} from '../streak/calendarUtc.js';
import { tryAnchoredDailyReadStreakFromRedis } from './readStreakRedisDisplay.js';

type RedisClient = ReturnType<typeof createClient> | null;

/** Re-export for callers (`blog.controller`, etc.). Canonical impl: `server/src/streak/calendarUtc.ts`. */
export { streakUtcDayBucket } from '../streak/calendarUtc.js';

export type ReadStreakMode = 'daily' | 'weekly' | 'monthly';

export type ReadStreakCounts = { current: number; longest: number };

const WEEK_MS = 7 * MS_PER_DAY;

export { READ_HEATMAP_WINDOW_DAYS };

/** Monday 00:00 UTC of the ISO week containing `d`. */
export function utcMondayOfWeekContaining(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay();
  const daysFromMonday = (dow + 6) % 7;
  t.setUTCDate(t.getUTCDate() - daysFromMonday);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

function monthIndex(d: Date): number {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

function addMonthsIndex(idx: number, delta: number): number {
  return idx + delta;
}

/** UTC midnights for each distinct day the user read at least one qualifying published post (see read-day endpoint). */
export async function loadUtcReadDayMidnightsForReader(
  readerId: mongoose.Types.ObjectId
): Promise<Date[]> {
  const rows = await BlogReadDayModel.find({ readerId }).select('dayBucket').lean();
  const buckets = rows
    .map((r) => (r as { dayBucket?: string }).dayBucket)
    .filter((b): b is string => typeof b === 'string' && DAY_BUCKET_RE.test(b));
  return buckets.map(utcMidnightFromDayBucket);
}

export async function countDistinctReadDaysForReader(
  readerId: mongoose.Types.ObjectId
): Promise<number> {
  return BlogReadDayModel.countDocuments({ readerId });
}

/** Latest UTC `dayBucket` for the reader (lexicographic max works for `YYYY-MM-DD`). */
export async function getMaxDayBucketForReader(
  readerId: mongoose.Types.ObjectId
): Promise<string | null> {
  const row = await BlogReadDayModel.findOne({ readerId })
    .sort({ dayBucket: -1 })
    .select('dayBucket')
    .lean();
  const b = (row as { dayBucket?: string } | null)?.dayBucket;
  return typeof b === 'string' && DAY_BUCKET_RE.test(b) ? b : null;
}

/** Distinct `dayBucket` strings in `[today - window + 1, today]` UTC for heatmap UI. */
export async function loadReadDayBucketsForHeatmap(
  readerId: mongoose.Types.ObjectId,
  now = new Date(),
  windowDays = READ_HEATMAP_WINDOW_DAYS
): Promise<string[]> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (windowDays - 1));
  const minBucket = streakUtcDayBucket(start);
  const rows = await BlogReadDayModel.find({
    readerId,
    dayBucket: { $gte: minBucket },
  })
    .select('dayBucket')
    .lean();
  const set = new Set<string>();
  for (const r of rows) {
    const b = (r as { dayBucket?: string }).dayBucket;
    if (typeof b === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b)) set.add(b);
  }
  return [...set].sort();
}

function longestConsecutiveSorted(sortedAsc: number[], stepMs: number): number {
  if (sortedAsc.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sortedAsc.length; i++) {
    if (sortedAsc[i] - sortedAsc[i - 1] === stepMs) {
      run++;
      best = Math.max(best, run);
    } else if (sortedAsc[i] !== sortedAsc[i - 1]) {
      run = 1;
    }
  }
  return best;
}

function currentStreakFromAnchor(
  sortedAsc: Set<number>,
  anchor: number,
  _stepMs: number,
  backward: (t: number) => number
): number {
  let n = 0;
  let t = anchor;
  while (sortedAsc.has(t)) {
    n++;
    t = backward(t);
  }
  return n;
}

/** Distinct UTC `YYYY-MM-DD` buckets from `dates`, sorted ascending, capped at `today` (lexicographic safe). */
function sortedUniqueDayBucketsUpToToday(dates: readonly Date[], now: Date): string[] {
  const todayB = streakUtcDayBucket(now);
  const set = new Set<string>();
  for (const d of dates) {
    const b = streakUtcDayBucket(d);
    if (b <= todayB) set.add(b);
  }
  return [...set].sort();
}

/**
 * Unanchored daily HASH state (§33 / Lua): same rolling `current`/`longest`/`lastDay` as incremental
 * `applyDailyStreakTransition`, **not** profile display anchor (today/yesterday).
 */
export function computeUnanchoredDailyStreakHashFields(
  dates: readonly Date[],
  now = new Date()
): { current: number; longest: number; lastDay: string } {
  const unique = sortedUniqueDayBucketsUpToToday(dates, now);
  if (unique.length === 0) return { current: 0, longest: 0, lastDay: '' };
  const r = recomputeDailyStreakFromSortedDays(unique);
  return { current: r.current, longest: r.longest, lastDay: r.lastDay };
}

/**
 * Daily read streak (basic): **§33 Single Source Streak Engine** via `recomputeDailyStreakFromSortedDays`,
 * plus profile anchor rule (active streak only if user read **today or yesterday** UTC).
 */
export function computeDailyStreak(dates: readonly Date[], now = new Date()): ReadStreakCounts {
  const todayB = streakUtcDayBucket(now);
  const yesterdayB = previousUtcCalendarDay(todayB);
  const unique = sortedUniqueDayBucketsUpToToday(dates, now);
  if (unique.length === 0) return { current: 0, longest: 0 };

  const r = recomputeDailyStreakFromSortedDays(unique);
  let { current } = r;
  if (!unique.includes(todayB) && !unique.includes(yesterdayB)) {
    current = 0;
  } else if (r.lastDay < yesterdayB) {
    current = 0;
  }
  return { current, longest: r.longest };
}

export function computeWeeklyStreak(dates: readonly Date[], now = new Date()): ReadStreakCounts {
  const mondays = new Set<number>();
  for (const d of dates) {
    mondays.add(utcMondayOfWeekContaining(d));
  }
  if (mondays.size === 0) return { current: 0, longest: 0 };
  const sorted = [...mondays].sort((a, b) => a - b);
  const longest = longestConsecutiveSorted(sorted, WEEK_MS);

  const thisMon = utcMondayOfWeekContaining(now);
  const lastMon = thisMon - WEEK_MS;
  let anchor: number | null = null;
  if (mondays.has(thisMon)) anchor = thisMon;
  else if (mondays.has(lastMon)) anchor = lastMon;
  else return { current: 0, longest };

  const current = currentStreakFromAnchor(mondays, anchor, WEEK_MS, (t) => t - WEEK_MS);
  return { current, longest };
}

export function computeMonthlyStreak(dates: readonly Date[], now = new Date()): ReadStreakCounts {
  const months = new Set<number>();
  for (const d of dates) {
    months.add(monthIndex(d));
  }
  if (months.size === 0) return { current: 0, longest: 0 };
  const sorted = [...months].sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) {
      run++;
      longest = Math.max(longest, run);
    } else if (sorted[i] !== sorted[i - 1]) {
      run = 1;
    }
  }

  const thisM = monthIndex(now);
  const prevM = addMonthsIndex(thisM, -1);
  let anchor: number | null = null;
  if (months.has(thisM)) anchor = thisM;
  else if (months.has(prevM)) anchor = prevM;
  else return { current: 0, longest };

  const current = (() => {
    let n = 0;
    let idx = anchor;
    while (months.has(idx)) {
      n++;
      idx = addMonthsIndex(idx, -1);
    }
    return n;
  })();

  return { current, longest };
}

export type ReadStreakPayload = {
  displayMode: ReadStreakMode;
  current: number;
  longest: number;
  /** Distinct UTC days with at least one recorded read of someone else’s published post. */
  totalDistinctReadDays: number;
  byMode: Record<ReadStreakMode, ReadStreakCounts>;
};

/** `displayMode` comes from user `blogStreakMode` in DB (legacy field name = read-streak display preference). */
export async function computeReadStreakPayload(
  profileUserId: mongoose.Types.ObjectId,
  displayMode: ReadStreakMode | undefined,
  now = new Date(),
  redis: RedisClient = null
): Promise<ReadStreakPayload> {
  const [dates, totalDistinctReadDays, mongoMaxDay] = await Promise.all([
    loadUtcReadDayMidnightsForReader(profileUserId),
    countDistinctReadDaysForReader(profileUserId),
    getMaxDayBucketForReader(profileUserId),
  ]);
  const mode: ReadStreakMode =
    displayMode === 'weekly' || displayMode === 'monthly' ? displayMode : 'daily';
  let daily = computeDailyStreak(dates, now);
  if (redis) {
    const fromRedis = await tryAnchoredDailyReadStreakFromRedis(
      redis,
      profileUserId,
      mongoMaxDay,
      now
    );
    if (fromRedis) daily = fromRedis;
  }
  const weekly = computeWeeklyStreak(dates, now);
  const monthly = computeMonthlyStreak(dates, now);
  const byMode = { daily, weekly, monthly };
  const sel = byMode[mode];
  return {
    displayMode: mode,
    current: sel.current,
    longest: sel.longest,
    totalDistinctReadDays,
    byMode,
  };
}
