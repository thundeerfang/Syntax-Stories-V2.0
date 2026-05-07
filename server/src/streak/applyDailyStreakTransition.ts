import { previousUtcCalendarDay } from './calendarUtc.js';

export type DailyStreakState = {
  lastDay: string | null | undefined;
  current: number;
  longest: number;
  today: string;
  yesterday: string;
};

export type DailyStreakTransitionResult = {
  current: number;
  longest: number;
  lastDay: string;
  applied: boolean;
};

/**
 * Single canonical daily basic streak step (§33). Freeze/recovery wrap this, never fork it.
 */
export function applyDailyStreakTransition(input: DailyStreakState): DailyStreakTransitionResult {
  const { lastDay, current: cur0, longest: lng0, today, yesterday } = input;
  let current = cur0;
  let longest = lng0;

  if (lastDay === today) {
    return { current, longest, lastDay: today, applied: false };
  }
  if (!lastDay) {
    current = 1;
  } else if (lastDay === yesterday) {
    current = current + 1;
  } else {
    current = 1;
  }
  longest = Math.max(longest, current);
  return { current, longest, lastDay: today, applied: true };
}

/**
 * Fold sorted unique day buckets (ascending) through the same transition as incremental commits.
 * Used for reconciliation / cold recompute (§33).
 */
export function recomputeDailyStreakFromSortedDays(
  sortedUniqueDayBuckets: string[]
): { current: number; longest: number; lastDay: string } {
  let lastDay = '';
  let current = 0;
  let longest = 0;
  for (const today of sortedUniqueDayBuckets) {
    const yesterday = previousUtcCalendarDay(today);
    const out = applyDailyStreakTransition({
      lastDay: lastDay || undefined,
      current,
      longest,
      today,
      yesterday,
    });
    current = out.current;
    longest = out.longest;
    lastDay = out.lastDay;
  }
  return { current, longest, lastDay };
}
