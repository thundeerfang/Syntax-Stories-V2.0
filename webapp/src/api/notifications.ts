import { blogAuthFetch } from '@/lib/api/blogAuthFetch';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';

export type { AppNotification } from '@contracts/notificationsApi';
import type { AppNotification } from '@contracts/notificationsApi';

function apiBase(): string {
  return resolvePublicApiBase();
}

export async function fetchNotifications(accessToken: string): Promise<AppNotification[]> {
  const res = await blogAuthFetch(`${apiBase()}/api/notifications`, { method: 'GET' }, accessToken);
  const data = (await res.json()) as {
    success?: boolean;
    notifications?: AppNotification[];
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message ?? res.statusText);
  }
  return Array.isArray(data.notifications) ? data.notifications : [];
}

export async function markAllNotificationsRead(accessToken: string): Promise<void> {
  const res = await blogAuthFetch(
    `${apiBase()}/api/notifications/read-all`,
    { method: 'POST' },
    accessToken,
  );
  if (!res.ok) {
    const data = (await res.json()) as { message?: string };
    throw new Error(data.message ?? res.statusText);
  }
}
