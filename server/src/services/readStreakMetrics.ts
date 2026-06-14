const counts = {
  readViewStartRateLimited: 0,
  readViewCommitRedisFail: 0,
  readStreakReconcileUsers: 0,
};
export type ReadStreakMetricKey = keyof typeof counts;
export function incrementReadStreakMetric(
  key: ReadStreakMetricKey,
  delta = 1,
): void {
  counts[key] += delta;
}
export function getReadStreakMetricsSnapshot(): Readonly<typeof counts> {
  return { ...counts };
}
