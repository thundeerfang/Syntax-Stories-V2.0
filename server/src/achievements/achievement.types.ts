export const ACHIEVEMENT_CATEGORIES = [
  "engagement",
  "profile",
  "reading",
  "social",
  "meta",
] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];
export const ACHIEVEMENT_MODULES = [
  "profile",
  "blog",
  "reading",
  "social",
  "engagement",
  "meta",
] as const;
export type AchievementModule = (typeof ACHIEVEMENT_MODULES)[number];
export const ACHIEVEMENT_CELEBRATE_AS = ["dialog"] as const;
export type AchievementCelebrateAs = (typeof ACHIEVEMENT_CELEBRATE_AS)[number];
export const ACHIEVEMENT_CELEBRATE_DIALOG: AchievementCelebrateAs = "dialog";
export const ACHIEVEMENT_METRICS = [
  "respect.given.total",
  "respect.received.total",
  "read.brief.total",
  "stack.tools.count",
  "followers.count",
  "read.streak.longest",
  "profile.has_avatar",
  "profile.has_location",
  "profile.has_cv",
  "profile.has_bio",
  "profile.has_cover",
  "profile.has_github",
  "profile.setup.count",
  "social.following.count",
  "blog.categories.followed.count",
  "squads.joined.count",
  "feedback.submitted.count",
  "posts.authored.count",
  "referral.converted.total",
] as const;
export type AchievementMetric = (typeof ACHIEVEMENT_METRICS)[number];
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
  | {
      type: "respect_given";
    }
  | {
      type: "brief_read";
    }
  | {
      type: "profile_sync";
      metrics?: AchievementMetric[];
    }
  | {
      type: "cv_parsed";
    }
  | {
      type: "referral_converted";
    };
export type MetricSnapshot = Record<AchievementMetric, number>;
