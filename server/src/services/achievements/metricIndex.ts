import type { AchievementDef, AchievementMetric } from '../../achievements/achievement.types.js';

export type AchievementMetricIndex = Map<AchievementMetric, AchievementDef[]>;

export function buildAchievementMetricIndex(catalog: AchievementDef[]): AchievementMetricIndex {
  const index: AchievementMetricIndex = new Map();
  for (const def of catalog) {
    const list = index.get(def.metric) ?? [];
    list.push(def);
    index.set(def.metric, list);
  }
  for (const [, list] of index) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return index;
}

/** Map achievement events to metrics that may have changed. */
export function metricsAffectedByEvents(
  events: Array<{ type: string }>
): Set<AchievementMetric> | null {
  const set = new Set<AchievementMetric>();
  let profileSync = false;

  for (const e of events) {
    if (e.type === 'respect_given') set.add('respect.given.total');
    if (e.type === 'brief_read') set.add('read.brief.total');
    if (e.type === 'profile_sync') profileSync = true;
    if (e.type === 'cv_parsed') set.add('profile.has_cv');
    if (e.type === 'referral_converted') set.add('referral.converted.total');
  }

  if (profileSync) return null;
  return set;
}

export function filterCatalogByMetrics(
  catalog: AchievementDef[],
  metrics: Set<AchievementMetric> | null,
  index: AchievementMetricIndex
): AchievementDef[] {
  if (metrics === null) return [...catalog].sort((a, b) => a.sortOrder - b.sortOrder);
  const ids = new Set<string>();
  const result: AchievementDef[] = [];
  for (const metric of metrics) {
    for (const def of index.get(metric) ?? []) {
      if (!ids.has(def.id)) {
        ids.add(def.id);
        result.push(def);
      }
    }
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}
