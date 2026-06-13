export type AchievementCategory = 'engagement' | 'profile' | 'reading' | 'social' | 'meta';

/** Platform module that owns the metric / unlock trigger for this achievement. */
export type AchievementModule = 'profile' | 'blog' | 'reading' | 'social' | 'engagement' | 'meta';

export type AchievementCelebrateAs = 'dialog';

export type AchievementMetric =
  | 'respect.given.total'
  | 'respect.received.total'
  | 'read.brief.total'
  | 'stack.tools.count'
  | 'followers.count'
  | 'read.streak.longest'
  | 'profile.has_avatar'
  | 'profile.has_location'
  | 'profile.has_work'
  | 'profile.has_education'
  | 'profile.has_cv'
  | 'profile.has_bio'
  | 'profile.has_cover'
  | 'profile.has_github'
  | 'profile.setup.count'
  | 'social.following.count'
  | 'blog.categories.followed.count'
  | 'squads.joined.count'
  | 'feedback.submitted.count'
  | 'posts.authored.count'
  | 'referral.converted.total';

export type AchievementDef = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: AchievementCategory;
  module: AchievementModule;
  points: number;
  metric: AchievementMetric;
  target: number;
  unlocksAfter?: string;
  celebrateAs: AchievementCelebrateAs;
  sortOrder: number;
};

export type AchievementUnlockDto = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: AchievementCategory;
  points: number;
  celebrateAs: AchievementCelebrateAs;
  metric: AchievementMetric;
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
  metric: AchievementMetric;
  target: number;
  current: number;
  unlocked: boolean;
  unlockedAt: string | null;
  celebrateAs: AchievementCelebrateAs;
  locked: boolean;
};

export type AchievementEvent =
  | { type: 'respect_given' }
  | { type: 'brief_read' }
  | { type: 'profile_sync' }
  | { type: 'cv_parsed' }
  | { type: 'referral_converted' };

export type MetricSnapshot = Record<AchievementMetric, number>;
