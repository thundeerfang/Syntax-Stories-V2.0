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
