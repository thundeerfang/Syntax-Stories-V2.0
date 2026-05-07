import {
  READ_DAYS_ZSET_RETAIN_DAYS,
  readDayZsetScoreMs,
  readDaysTrimMinRetainMsUtc,
  readDaysZsetTrimExclusiveMaxArg,
} from '../services/readStreakZset.js';

describe('readDays ZSET helpers (F.4)', () => {
  it('readDaysTrimMinRetainMsUtc is UTC midnight of (today - retainDays + 1)', () => {
    const now = new Date(Date.UTC(2026, 4, 10));
    const ms = readDaysTrimMinRetainMsUtc(now);
    const expected = new Date(Date.UTC(2026, 4, 10));
    expected.setUTCDate(expected.getUTCDate() - (READ_DAYS_ZSET_RETAIN_DAYS - 1));
    expect(ms).toBe(expected.getTime());
  });

  it('readDayZsetScoreMs matches UTC midnight for bucket', () => {
    expect(readDayZsetScoreMs('2026-05-05')).toBe(Date.UTC(2026, 4, 5));
  });

  it('readDaysZsetTrimExclusiveMaxArg formats Redis exclusive upper bound', () => {
    expect(readDaysZsetTrimExclusiveMaxArg(123)).toBe('(123');
  });
});
