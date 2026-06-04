/**
 * Notifications JSON API — `/api/notifications/*`.
 * Keep in sync with `server/src/routes/notifications.routes.ts`.
 */

export const NOTIFICATION_TYPES = [
  'repost_milestone',
  'view_milestone',
  'respect_milestone',
  'category_new_post',
  'tag_new_post',
  'squad_new_post',
  'following_new_post',
  'blog_trending',
  'post_trending',
  'referral_accepted',
  'settings_update',
  'achievement_unlocked',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_ICONS = [
  'bell',
  'repeat',
  'eye',
  'heart',
  'tag',
  'users',
  'trending',
  'user-plus',
  'settings',
  'mail',
  'award',
] as const;

export type NotificationIcon = (typeof NOTIFICATION_ICONS)[number];

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  icon: NotificationIcon;
  time: string;
  unread: boolean;
}

export interface NotificationsListResponse {
  success: boolean;
  notifications: AppNotification[];
  unreadCount?: number;
}

/** User-facing alert preferences only — webhooks are platform admin infrastructure. */
export interface NotificationPreferences {
  inAppEnabled: boolean;
  milestonesEnabled: boolean;
  followingEnabled: boolean;
  trendingEnabled: boolean;
  settingsEnabled: boolean;
  referralsEnabled: boolean;
  squadsEnabled: boolean;
  categoriesEnabled: boolean;
  tagsEnabled: boolean;
  achievementsEnabled: boolean;
}

export interface NotificationPreferencesResponse {
  success: boolean;
  preferences: NotificationPreferences;
}

export interface NotificationStreamPayload {
  v: 1;
  type: 'user_notification';
  notification: AppNotification & { kind?: NotificationType };
  ts: number;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  repost_milestone: 'Reposts',
  view_milestone: 'Views',
  respect_milestone: 'Respects',
  category_new_post: 'Category',
  tag_new_post: 'Topic',
  squad_new_post: 'Squad',
  following_new_post: 'Following',
  blog_trending: 'Trending',
  post_trending: 'Trending',
  referral_accepted: 'Invite',
  settings_update: 'Settings',
  achievement_unlocked: 'Achievement',
};
