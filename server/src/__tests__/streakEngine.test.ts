import { applyDailyStreakTransition, recomputeDailyStreakFromSortedDays } from '../streak/applyDailyStreakTransition.js';
import {
  assertTodayIsNextUtcDayAfterYesterday,
  isValidUtcDayBucket,
  nextUtcCalendarDay,
  previousUtcCalendarDay,
} from '../streak/calendarUtc.js';
import { dailyStreakGoldenCases, dailyStreakGoldenExpected } from '../streak/dailyStreakGoldenCases.js';

describe('Single Source Streak Engine (§33) — Phase 1', () => {
  describe('Golden Test Contract', () => {
    it('applyDailyStreakTransition matches golden expected for every fixture', () => {
      expect(dailyStreakGoldenCases.length).toBe(dailyStreakGoldenExpected.length);
      for (let i = 0; i < dailyStreakGoldenCases.length; i++) {
        const got = applyDailyStreakTransition(dailyStreakGoldenCases[i]!);
        expect(got).toEqual(dailyStreakGoldenExpected[i]);
      }
    });
  });

  describe('calendarUtc', () => {
    it('previous/next round-trip', () => {
      expect(previousUtcCalendarDay('2026-05-05')).toBe('2026-05-04');
      expect(nextUtcCalendarDay('2026-05-04')).toBe('2026-05-05');
    });

    it('assertTodayIsNextUtcDayAfterYesterday accepts valid pair', () => {
      expect(() => assertTodayIsNextUtcDayAfterYesterday('2026-05-05', '2026-05-04')).not.toThrow();
    });

    it('assertTodayIsNextUtcDayAfterYesterday rejects bad pair', () => {
      expect(() => assertTodayIsNextUtcDayAfterYesterday('2026-05-05', '2026-05-03')).toThrow('DAY_BUCKET_PAIR_MISMATCH');
    });

    it('isValidUtcDayBucket', () => {
      expect(isValidUtcDayBucket('2026-05-05')).toBe(true);
      expect(isValidUtcDayBucket('2026-13-01')).toBe(false);
      expect(isValidUtcDayBucket('bad')).toBe(false);
    });
  });

  describe('recomputeDailyStreakFromSortedDays', () => {
    it('empty → zeros', () => {
      expect(recomputeDailyStreakFromSortedDays([])).toEqual({ current: 0, longest: 0, lastDay: '' });
    });

    it('single day', () => {
      expect(recomputeDailyStreakFromSortedDays(['2026-05-05'])).toEqual({
        current: 1,
        longest: 1,
        lastDay: '2026-05-05',
      });
    });

    it('three consecutive days', () => {
      const r = recomputeDailyStreakFromSortedDays(['2026-05-03', '2026-05-04', '2026-05-05']);
      expect(r).toEqual({ current: 3, longest: 3, lastDay: '2026-05-05' });
    });

    it('gap resets current; longest preserved', () => {
      const r = recomputeDailyStreakFromSortedDays(['2026-05-01', '2026-05-02', '2026-05-05']);
      expect(r.current).toBe(1);
      expect(r.longest).toBe(2);
      expect(r.lastDay).toBe('2026-05-05');
    });
  });
});
