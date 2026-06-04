/** Notification kinds — keep in sync with `webapp/src/contracts/notificationsApi.ts`. */
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

export const REPOST_MILESTONES = [100, 1000] as const;
export const VIEW_MILESTONES = [100, 500, 1000] as const;
export const RESPECT_MILESTONES = [100, 500, 1000] as const;

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  icon?: NotificationIcon;
  metadata?: Record<string, unknown>;
  /** Skip webhook delivery (e.g. bulk fan-out). Default false. */
  skipWebhook?: boolean;
};

export type NotificationPayload = {
  v: 1;
  type: 'user_notification';
  notification: {
    id: string;
    kind: NotificationType;
    type: NotificationType;
    title: string;
    message: string;
    href: string;
    icon: NotificationIcon;
    time: string;
    unread: boolean;
    metadata?: Record<string, unknown>;
  };
  ts: number;
};
