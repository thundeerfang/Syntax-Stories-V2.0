import { READ_HEATMAP_WINDOW_DAYS } from '@/lib/readHeatmapConstants';

export type HeatmapCell = { date: string; level: number };

function utcDayStringFromDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Compact heatmap cells for card export (last N UTC days). */
export function buildHeatmapCells(
  activeDayBuckets: readonly string[] | null | undefined,
  windowDays = READ_HEATMAP_WINDOW_DAYS,
): HeatmapCell[] {
  const active = new Set(activeDayBuckets ?? []);
  const anchor = new Date();
  const todayUtc = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
  const cells: HeatmapCell[] = [];
  const days = Math.max(1, windowDays);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayUtc);
    d.setUTCDate(d.getUTCDate() - i);
    const date = utcDayStringFromDate(d);
    cells.push({ date, level: active.has(date) ? 4 : 0 });
  }
  return cells;
}

/** Derive UTC publish-day buckets from blog post timestamps. */
export function publishDaysFromPosts(
  posts: ReadonlyArray<{ createdAt?: string; updatedAt?: string }>,
): string[] {
  const days = new Set<string>();
  for (const post of posts) {
    const raw = post.createdAt ?? post.updatedAt;
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    days.add(utcDayStringFromDate(d));
  }
  return [...days];
}
