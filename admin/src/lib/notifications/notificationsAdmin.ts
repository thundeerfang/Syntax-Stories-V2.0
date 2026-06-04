import { adminAuthenticatedFetch } from '@/lib/auth/adminAuthenticatedFetch';

const MGMT = '/api/v1/admin/management';

export type PlatformNotificationConfig = {
  webhookEnabled: boolean;
  webhookUrl: string;
  hasWebhookSecret: boolean;
  webhookSecret?: string;
  updatedAt: string | null;
};

export type NotificationDeliveryStats = {
  totalNotifications: number;
  unreadNotifications: number;
  auditRows: number;
  webhookSent: number;
  webhookFailed: number;
};

export type NotificationAuditRow = {
  id: string;
  action: string;
  userId: string | null;
  notificationId: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string | null;
};

type AdminOk<T> = { success?: boolean; data?: T; error?: { message?: string }; message?: string };

function throwFrom(res: Response, json: AdminOk<unknown>): never {
  throw new Error(json.error?.message ?? json.message ?? `Request failed (${res.status})`);
}

export async function getAdminNotificationConfig(token: string): Promise<PlatformNotificationConfig> {
  const res = await adminAuthenticatedFetch(`${MGMT}/notifications/config`, { token });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{ config: PlatformNotificationConfig }>;
  if (!res.ok || !json.success || !json.data?.config) throwFrom(res, json);
  return json.data.config;
}

export async function patchAdminNotificationConfig(
  token: string,
  patch: Partial<Pick<PlatformNotificationConfig, 'webhookEnabled' | 'webhookUrl' | 'webhookSecret'>>
): Promise<PlatformNotificationConfig> {
  const res = await adminAuthenticatedFetch(`${MGMT}/notifications/config`, {
    token,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{ config: PlatformNotificationConfig }>;
  if (!res.ok || !json.success || !json.data?.config) throwFrom(res, json);
  return json.data.config;
}

export async function getAdminNotificationStats(token: string): Promise<NotificationDeliveryStats> {
  const res = await adminAuthenticatedFetch(`${MGMT}/notifications/stats`, { token });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{ stats: NotificationDeliveryStats }>;
  if (!res.ok || !json.success || !json.data?.stats) throwFrom(res, json);
  return json.data.stats;
}

export async function listAdminNotificationAudit(
  token: string,
  params?: { limit?: number; cursor?: string | null }
): Promise<{ items: NotificationAuditRow[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.cursor) q.set('cursor', params.cursor);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  const res = await adminAuthenticatedFetch(`${MGMT}/notifications/audit${suffix}`, { token });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{
    items: NotificationAuditRow[];
    nextCursor: string | null;
  }>;
  if (!res.ok || !json.success || !json.data?.items) throwFrom(res, json);
  return { items: json.data.items, nextCursor: json.data.nextCursor ?? null };
}

export async function postAdminNotificationWebhookTest(token: string): Promise<{ message: string }> {
  const res = await adminAuthenticatedFetch(`${MGMT}/notifications/webhook/test`, {
    token,
    method: 'POST',
  });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{ message?: string }>;
  if (!res.ok || !json.success) throwFrom(res, json);
  return { message: json.data?.message ?? 'Test webhook dispatched.' };
}
