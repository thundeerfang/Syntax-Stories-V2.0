import { blogAuthFetch } from '@/lib/api/blogAuthFetch';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';

export type {
  AppNotification,
  NotificationPreferences,
  NotificationStreamPayload,
} from '@contracts/notificationsApi';
import type {
  AppNotification,
  NotificationPreferences,
  NotificationPreferencesResponse,
  NotificationsListResponse,
} from '@contracts/notificationsApi';

function apiBase(): string {
  return resolvePublicApiBase();
}

export async function fetchNotifications(
  accessToken: string
): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  const res = await blogAuthFetch(`${apiBase()}/api/notifications`, { method: 'GET' }, accessToken);
  const data = (await res.json()) as NotificationsListResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? res.statusText);
  }
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
  };
}

export async function markAllNotificationsRead(accessToken: string): Promise<void> {
  const res = await blogAuthFetch(
    `${apiBase()}/api/notifications/read-all`,
    { method: 'POST' },
    accessToken
  );
  if (!res.ok) {
    const data = (await res.json()) as { message?: string };
    throw new Error(data.message ?? res.statusText);
  }
}

export async function markNotificationRead(
  accessToken: string,
  notificationId: string
): Promise<void> {
  const res = await blogAuthFetch(
    `${apiBase()}/api/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'POST' },
    accessToken
  );
  if (!res.ok) {
    const data = (await res.json()) as { message?: string };
    throw new Error(data.message ?? res.statusText);
  }
}

export async function fetchNotificationPreferences(
  accessToken: string
): Promise<NotificationPreferences> {
  const res = await blogAuthFetch(
    `${apiBase()}/api/notifications/preferences`,
    { method: 'GET' },
    accessToken
  );
  const data = (await res.json()) as NotificationPreferencesResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? res.statusText);
  }
  return data.preferences;
}

export async function updateNotificationPreferences(
  accessToken: string,
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const res = await blogAuthFetch(
    `${apiBase()}/api/notifications/preferences`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
    accessToken
  );
  const data = (await res.json()) as NotificationPreferencesResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? res.statusText);
  }
  return data.preferences;
}

export function notificationsStreamUrl(): string {
  return `${apiBase()}/api/notifications/stream`;
}
