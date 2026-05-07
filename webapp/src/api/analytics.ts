import { resolvePublicApiBase } from '@/lib/publicApiBase';

const getApiBase = () => resolvePublicApiBase();

export interface ProfileOverviewMetrics {
  viewsToday: number;
  views7Days: number;
  views30Days: number;
  uniqueVisitors7Days: number;
  repeatVisitors7Days: number;
  totalViews: number;
}

export interface ProfileTimePoint {
  date: string;
  views: number;
}

export const analyticsApi = {
  // Public: does NOT require auth token; only uses cookies for anon dedupe
  recordProfileView: async (username: string): Promise<void> => {
    try {
      const url = `${getApiBase()}/api/analytics/profile-view/${encodeURIComponent(username)}`;
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      }).catch(() => {});
    } catch {
      // best-effort only
    }
  },

  getProfileOverview: async (username: string): Promise<ProfileOverviewMetrics | null> => {
    try {
      const res = await fetch(`${getApiBase()}/api/analytics/profile-overview/${encodeURIComponent(username)}`);
      if (!res.ok) return null;
      const json = (await res.json()) as { success: boolean; metrics?: ProfileOverviewMetrics };
      if (!json.success || !json.metrics) return null;
      return json.metrics;
    } catch {
      return null;
    }
  },

  getProfileTimeSeries: async (username: string): Promise<ProfileTimePoint[]> => {
    try {
      const res = await fetch(`${getApiBase()}/api/analytics/profile/${encodeURIComponent(username)}/timeseries`);
      if (!res.ok) return [];
      const json = (await res.json()) as { success: boolean; series?: ProfileTimePoint[] };
      if (!json.success || !json.series) return [];
      return json.series;
    } catch {
      return [];
    }
  },
};

