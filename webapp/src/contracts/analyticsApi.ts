/**
 * Profile analytics JSON API — `/api/analytics/*`.
 * Keep in sync with `server/src/routes/analytics.routes.ts`.
 */

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

export interface ProfileOverviewResponse {
  success: boolean;
  metrics: ProfileOverviewMetrics;
}

export interface ProfileTimeseriesResponse {
  success: boolean;
  points: ProfileTimePoint[];
}
