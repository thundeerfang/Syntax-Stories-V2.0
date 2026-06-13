export type AchievementCategory = 'engagement' | 'profile' | 'reading' | 'social' | 'meta';

export type AchievementCelebrateAs = 'dialog';

export type AchievementUnlockDto = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: AchievementCategory;
  points: number;
  celebrateAs: AchievementCelebrateAs;
  metric: string;
  target: number;
  current: number;
};

export type AchievementProgressItemDto = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: AchievementCategory;
  points: number;
  metric: string;
  target: number;
  current: number;
  unlocked: boolean;
  unlockedAt: string | null;
  celebrateAs: AchievementCelebrateAs;
  locked: boolean;
};

export type AchievementsListResponse = {
  success: boolean;
  catalogVersion: number;
  total: number;
  unlockedCount: number;
  totalPoints: number;
  xp?: number;
  level?: number;
  items: AchievementProgressItemDto[];
};

export type AchievementsSummaryResponse = {
  success: boolean;
  unlockedCount: number;
  total: number;
  totalPoints: number;
  xp?: number;
  level?: number;
};

export type AchievementsPayload = {
  newlyUnlocked: AchievementUnlockDto[];
};

export type AchievementUnlockStreamEvent =
  | { type: 'connected'; userId: string }
  | { type: 'unlock'; payload: { unlocks: AchievementUnlockDto[]; ts?: number } }
  | { type: 'raw'; payload: unknown };
