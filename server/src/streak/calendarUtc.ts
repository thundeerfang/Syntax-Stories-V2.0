import { DAY_BUCKET_RE } from "../variable/constants.js";
export function streakUtcDayBucket(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function utcMidnightFromDayBucket(dayBucket: string): Date {
  const [ys, ms, ds] = dayBucket.split("-");
  const y = Number(ys);
  const mo = Number(ms) - 1;
  const d = Number(ds);
  return new Date(Date.UTC(y, mo, d));
}
export function isValidUtcDayBucket(s: string): boolean {
  if (!DAY_BUCKET_RE.test(s)) return false;
  const d = utcMidnightFromDayBucket(s);
  return streakUtcDayBucket(d) === s;
}
export function previousUtcCalendarDay(today: string): string {
  const d = utcMidnightFromDayBucket(today);
  d.setUTCDate(d.getUTCDate() - 1);
  return streakUtcDayBucket(d);
}
export function nextUtcCalendarDay(yesterday: string): string {
  const d = utcMidnightFromDayBucket(yesterday);
  d.setUTCDate(d.getUTCDate() + 1);
  return streakUtcDayBucket(d);
}
export function assertTodayIsNextUtcDayAfterYesterday(
  today: string,
  yesterday: string,
): void {
  if (!isValidUtcDayBucket(today) || !isValidUtcDayBucket(yesterday)) {
    throw new Error("INVALID_DAY_BUCKET_PAIR");
  }
  if (nextUtcCalendarDay(yesterday) !== today) {
    throw new Error("DAY_BUCKET_PAIR_MISMATCH");
  }
}
