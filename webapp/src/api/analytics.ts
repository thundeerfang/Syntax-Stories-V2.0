import { resolvePublicApiBase } from "@/lib/api/publicApiBase";
const getApiBase = () => resolvePublicApiBase();
export type {
  ProfileOverviewMetrics,
  ProfileTimePoint,
} from "@contracts/analyticsApi";
import type {
  ProfileOverviewMetrics,
  ProfileTimePoint,
} from "@contracts/analyticsApi";
export const analyticsApi = {
  recordProfileView: async (username: string): Promise<void> => {
    try {
      const url = `${getApiBase()}/api/analytics/profile-view/${encodeURIComponent(username)}`;
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      }).catch(() => {});
    } catch {}
  },
  getProfileOverview: async (
    username: string,
  ): Promise<ProfileOverviewMetrics | null> => {
    try {
      const res = await fetch(
        `${getApiBase()}/api/analytics/profile-overview/${encodeURIComponent(username)}`,
      );
      if (!res.ok) return null;
      const json = (await res.json()) as {
        success: boolean;
        metrics?: ProfileOverviewMetrics;
      };
      if (!json.success || !json.metrics) return null;
      return json.metrics;
    } catch {
      return null;
    }
  },
  getProfileTimeSeries: async (
    username: string,
  ): Promise<ProfileTimePoint[]> => {
    try {
      const res = await fetch(
        `${getApiBase()}/api/analytics/profile/${encodeURIComponent(username)}/timeseries`,
      );
      if (!res.ok) return [];
      const json = (await res.json()) as {
        success: boolean;
        series?: ProfileTimePoint[];
      };
      if (!json.success || !json.series) return [];
      return json.series;
    } catch {
      return [];
    }
  },
};
