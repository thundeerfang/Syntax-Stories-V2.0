import { utcMidnightFromDayBucket } from "../streak/calendarUtc.js";
import { READ_DAYS_ZSET_RETAIN_DAYS } from "../variable/constants.js";
export { READ_DAYS_ZSET_RETAIN_DAYS };
export function readDaysTrimMinRetainMsUtc(now: Date): number {
  const anchor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  anchor.setUTCDate(anchor.getUTCDate() - (READ_DAYS_ZSET_RETAIN_DAYS - 1));
  return anchor.getTime();
}
export function readDaysZsetTrimExclusiveMaxArg(
  trimMinRetainMs: number,
): string {
  return `(${trimMinRetainMs}`;
}
export function readDayZsetScoreMs(dayBucket: string): number {
  return utcMidnightFromDayBucket(dayBucket).getTime();
}
