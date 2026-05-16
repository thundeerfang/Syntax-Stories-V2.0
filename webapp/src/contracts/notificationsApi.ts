/**
 * Notifications JSON API — `/api/notifications/*`.
 * Keep in sync with `server/src/routes/notifications.routes.ts`.
 */

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  href: string;
  time: string;
  unread: boolean;
}

export interface NotificationsListResponse {
  success: boolean;
  notifications: AppNotification[];
}
