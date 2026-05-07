import type { DailyStreakState, DailyStreakTransitionResult } from './applyDailyStreakTransition.js';

/** Shared vectors for TS tests and future Lua golden parity (§33 Golden Test Contract). */
export const dailyStreakGoldenCases: readonly DailyStreakState[] = [
  { lastDay: null, current: 0, longest: 0, today: '2026-05-05', yesterday: '2026-05-04' },
  { lastDay: '2026-05-04', current: 3, longest: 5, today: '2026-05-05', yesterday: '2026-05-04' },
  { lastDay: '2026-05-01', current: 3, longest: 5, today: '2026-05-05', yesterday: '2026-05-04' },
  { lastDay: '2026-05-05', current: 3, longest: 5, today: '2026-05-05', yesterday: '2026-05-04' },
] as const;

/** Expected outputs for `dailyStreakGoldenCases` (TS reference). */
export const dailyStreakGoldenExpected: readonly DailyStreakTransitionResult[] = [
  { current: 1, longest: 1, lastDay: '2026-05-05', applied: true },
  { current: 4, longest: 5, lastDay: '2026-05-05', applied: true },
  { current: 1, longest: 5, lastDay: '2026-05-05', applied: true },
  { current: 3, longest: 5, lastDay: '2026-05-05', applied: false },
];
