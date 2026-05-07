import {
  computeDailyStreak,
  computeMonthlyStreak,
  computeUnanchoredDailyStreakHashFields,
  computeWeeklyStreak,
  utcMondayOfWeekContaining,
} from '../services/readStreak.service.js';
import { anchorDailyStreakDisplayFromHash } from '../services/readStreakRedisDisplay.js';

describe('read streak helpers', () => {
  it('utcMondayOfWeekContaining returns Monday 00:00 UTC', () => {
    const wed = new Date(Date.UTC(2026, 4, 6));
    const mon = utcMondayOfWeekContaining(wed);
    expect(new Date(mon).getUTCDay()).toBe(1);
    expect(new Date(mon).toISOString().slice(0, 10)).toBe('2026-05-04');
  });

  it('computeDailyStreak: current counts consecutive days from today or yesterday', () => {
    const now = new Date(Date.UTC(2026, 4, 4));
    const dates = [new Date(Date.UTC(2026, 4, 4)), new Date(Date.UTC(2026, 4, 3)), new Date(Date.UTC(2026, 4, 2))];
    const r = computeDailyStreak(dates, now);
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
  });

  it('computeDailyStreak: broken when last activity is two days ago', () => {
    const now = new Date(Date.UTC(2026, 4, 4));
    const dates = [new Date(Date.UTC(2026, 4, 1))];
    const r = computeDailyStreak(dates, now);
    expect(r.current).toBe(0);
    expect(r.longest).toBe(1);
  });

  it('anchorDailyStreakDisplayFromHash matches computeDailyStreak anchor for HASH-shaped state', () => {
    const now = new Date(Date.UTC(2026, 4, 6));
    const fromHash = anchorDailyStreakDisplayFromHash('2026-05-05', 2, 2, now);
    const dates = [new Date(Date.UTC(2026, 4, 4)), new Date(Date.UTC(2026, 4, 5))];
    const fromMongo = computeDailyStreak(dates, now);
    expect(fromHash).not.toBeNull();
    expect(fromHash!.current).toBe(fromMongo.current);
    expect(fromHash!.longest).toBe(2);
  });

  it('computeUnanchoredDailyStreakHashFields: rolling state without profile anchor', () => {
    const now = new Date(Date.UTC(2026, 4, 4));
    const dates = [new Date(Date.UTC(2026, 4, 1))];
    expect(computeDailyStreak(dates, now).current).toBe(0);
    const h = computeUnanchoredDailyStreakHashFields(dates, now);
    expect(h.current).toBe(1);
    expect(h.longest).toBe(1);
    expect(h.lastDay).toBe('2026-05-01');
  });

  it('computeDailyStreak: anchor on yesterday — streak continues without read today', () => {
    const now = new Date(Date.UTC(2026, 4, 6));
    const dates = [
      new Date(Date.UTC(2026, 4, 4)),
      new Date(Date.UTC(2026, 4, 5)),
      new Date(Date.UTC(2026, 4, 3)),
    ];
    const r = computeDailyStreak(dates, now);
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
  });

  it('computeDailyStreak: Phase 2 uses §33 engine — gap in middle preserves longest', () => {
    const now = new Date(Date.UTC(2026, 4, 10));
    const dates = [
      new Date(Date.UTC(2026, 4, 1)),
      new Date(Date.UTC(2026, 4, 2)),
      new Date(Date.UTC(2026, 4, 5)),
      new Date(Date.UTC(2026, 4, 9)),
      new Date(Date.UTC(2026, 4, 10)),
    ];
    const r = computeDailyStreak(dates, now);
    expect(r.longest).toBe(2);
    expect(r.current).toBe(2);
  });

  it('computeWeeklyStreak: consecutive ISO weeks', () => {
    const now = new Date(Date.UTC(2026, 4, 6));
    const w0 = utcMondayOfWeekContaining(now);
    const wPrev = w0 - 7 * 86400000;
    const dates = [new Date(w0 + 3600000), new Date(wPrev + 3600000)];
    const r = computeWeeklyStreak(dates, now);
    expect(r.current).toBe(2);
    expect(r.longest).toBe(2);
  });

  it('computeMonthlyStreak: consecutive calendar months', () => {
    const now = new Date(Date.UTC(2026, 4, 15));
    const dates = [new Date(Date.UTC(2026, 4, 1)), new Date(Date.UTC(2026, 3, 10)), new Date(Date.UTC(2026, 2, 5))];
    const r = computeMonthlyStreak(dates, now);
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
  });
});
