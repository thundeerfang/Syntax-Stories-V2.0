import { adminAuthenticatedFetch } from '@/lib/auth/adminAuthenticatedFetch';
import { useSessionStore, type AdminSessionIdleStatus } from '@/store/session';

const BASE = '/api/v1/admin/management';

type ApiErr = { success?: boolean; error?: { code?: string; message?: string }; message?: string };

async function parseIdleResponse(res: Response): Promise<AdminSessionIdleStatus> {
  const json = (await res.json()) as { success?: boolean; data?: AdminSessionIdleStatus } & ApiErr;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? json.message ?? res.statusText);
  }
  return json.data;
}

export type { AdminSessionIdleStatus };

export function applySessionIdleStatus(status: AdminSessionIdleStatus): void {
  useSessionStore.setState({
    stepUpRequired: status.confirmationRequired,
    idleDeadlineAt: new Date(status.idleExpiresAt).getTime(),
    stepUpGraceDeadlineAt: status.graceExpiresAt
      ? new Date(status.graceExpiresAt).getTime()
      : null,
    lastActivityAt: new Date(status.lastActiveAt).getTime(),
    serverBootId: status.serverBootId,
    idleLimitSeconds: status.idleLimitSeconds,
    graceLimitSeconds: status.graceLimitSeconds,
  });
}

export function clearSessionIdleState(): void {
  useSessionStore.setState({
    stepUpRequired: false,
    idleDeadlineAt: null,
    stepUpGraceDeadlineAt: null,
    lastActivityAt: null,
    serverBootId: null,
    idleLimitSeconds: null,
    graceLimitSeconds: null,
  });
}

async function fetchSessionIdleStatus(token: string | null): Promise<AdminSessionIdleStatus> {
  const res = await adminAuthenticatedFetch(`${BASE}/session-idle`, { token });
  return parseIdleResponse(res);
}

async function touchAdminSession(token: string | null): Promise<AdminSessionIdleStatus> {
  const res = await adminAuthenticatedFetch(`${BASE}/session-touch`, { token, method: 'POST' });
  return parseIdleResponse(res);
}

export async function syncSessionIdle(token: string | null): Promise<AdminSessionIdleStatus | null> {
  try {
    const status = await fetchSessionIdleStatus(token);
    applySessionIdleStatus(status);
    return status;
  } catch {
    return null;
  }
}

export async function touchBackendSession(
  token: string | null
): Promise<AdminSessionIdleStatus | null> {
  try {
    const status = await touchAdminSession(token);
    applySessionIdleStatus(status);
    return status;
  } catch {
    return null;
  }
}
