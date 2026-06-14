/**
 * Public platform counters — `/api/platform/stats`.
 * Keep in sync with `server/src/shared/contracts/platformApi.ts`.
 */

export type PublicPlatformStatsDto = {
  linesWritten: number;
  activeUsers: number;
  components: number;
  uptimePercent: number;
  collectedAt: string;
};

export type PublicPlatformStatsResponse = {
  success: boolean;
  stats?: PublicPlatformStatsDto;
  message?: string;
};
