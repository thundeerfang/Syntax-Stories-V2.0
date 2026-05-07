/**
 * Lightweight in-process counters (F.8 sketch). For production, forward these to Prometheus/Datadog from logs or a scraper.
 */
const counts = {
  readViewStartRateLimited: 0,
  readViewCommitRedisFail: 0,
  readStreakReconcileUsers: 0,
};

export type ReadStreakMetricKey = keyof typeof counts;

export function incrementReadStreakMetric(key: ReadStreakMetricKey, delta = 1): void {
  counts[key] += delta;
}

export function getReadStreakMetricsSnapshot(): Readonly<typeof counts> {
  return { ...counts };
}
