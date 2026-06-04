/**
 * UTC calendar helpers for read-streak `YYYY-MM-DD` buckets (Single Source Streak Engine foundation).
 */

/** UTC calendar date `YYYY-MM-DD` for read-streak day buckets. */
export function streakUtcDayBucket(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function utcMidnightFromDayBucket(dayBucket: string): Date {
  const [ys, ms, ds] = dayBucket.split('-');
  const y = Number(ys);
  const mo = Number(ms) - 1;
  const d = Number(ds);
  return new Date(Date.UTC(y, mo, d));
}

const DAY_BUCKET_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidUtcDayBucket(s: string): boolean {
  if (!DAY_BUCKET_RE.test(s)) return false;
  const d = utcMidnightFromDayBucket(s);
  return streakUtcDayBucket(d) === s;
}

/** Calendar day immediately before `today` (UTC). */
export function previousUtcCalendarDay(today: string): string {
  const d = utcMidnightFromDayBucket(today);
  d.setUTCDate(d.getUTCDate() - 1);
  return streakUtcDayBucket(d);
}

/** Calendar day immediately after `yesterday` (UTC). */
export function nextUtcCalendarDay(yesterday: string): string {
  const d = utcMidnightFromDayBucket(yesterday);
  d.setUTCDate(d.getUTCDate() + 1);
  return streakUtcDayBucket(d);
}

/** Fails fast if `today` is not the UTC successor of `yesterday`. */
export function assertTodayIsNextUtcDayAfterYesterday(today: string, yesterday: string): void {
  if (!isValidUtcDayBucket(today) || !isValidUtcDayBucket(yesterday)) {
    throw new Error('INVALID_DAY_BUCKET_PAIR');
  }
  if (nextUtcCalendarDay(yesterday) !== today) {
    throw new Error('DAY_BUCKET_PAIR_MISMATCH');
  }
}
