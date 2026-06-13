import { utcMidnightFromDayBucket } from '../streak/calendarUtc.js';
import { READ_DAYS_ZSET_RETAIN_DAYS } from '../variable/constants.js';

export { READ_DAYS_ZSET_RETAIN_DAYS };

/** UTC midnight epoch **ms** for the oldest calendar day we retain (inclusive). */
export function readDaysTrimMinRetainMsUtc(now: Date): number {
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  anchor.setUTCDate(anchor.getUTCDate() - (READ_DAYS_ZSET_RETAIN_DAYS - 1));
  return anchor.getTime();
}

/**
 * Upper bound for `ZREMRANGEBYSCORE key -inf <max>` so members with `score === trimMinRetain` stay
 * (exclusive `(` on the bound per BLOG_READ_STREAK.md F.4).
 */
export function readDaysZsetTrimExclusiveMaxArg(trimMinRetainMs: number): string {
  return `(${trimMinRetainMs}`;
}

export function readDayZsetScoreMs(dayBucket: string): number {
  return utcMidnightFromDayBucket(dayBucket).getTime();
}
