import { apiUrl } from '@/lib/api';
import { adminFetchCredentials } from '@/lib/auth/adminFetchDefaults';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { applySessionIdleStatus } from '@/lib/auth/adminSessionIdleSync';
import { useSessionStore } from '@/store/session';

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

type AdminFetchInit = RequestInit & {
  /** Access token; omit when httpOnly cookies carry the session. */
  token?: string | null;
};

type StepUpWaiter = { resolve: () => void; reject: (err: Error) => void };

/** All in-flight requests waiting on the same step-up dialog. */
const stepUpWaiters: StepUpWaiter[] = [];

function waitForStepUp(): Promise<void> {
  return new Promise((resolve, reject) => {
    stepUpWaiters.push({ resolve, reject });
  });
}

async function refreshSessionIdleFromBackend(): Promise<void> {
  const { token, httpOnlyCookies } = useSessionStore.getState();
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  try {
    const res = await fetch(apiUrl('/api/v1/admin/management/session-idle'), {
      credentials: adminFetchCredentials(),
      headers: withBearer(apiToken, undefined),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { success?: boolean; data?: Parameters<typeof applySessionIdleStatus>[0] };
    if (json.success && json.data) applySessionIdleStatus(json.data);
  } catch {
    /* ignore */
  }
}

/** Called by StepUpDialogHost when user completes step-up. */
export function resolvePendingStepUp(): void {
  void refreshSessionIdleFromBackend();
  const batch = stepUpWaiters.splice(0);
  for (const waiter of batch) waiter.resolve();
}

export function rejectPendingStepUp(err: Error): void {
  useSessionStore.getState().setStepUpRequired(false);
  useSessionStore.setState({ stepUpGraceDeadlineAt: null });
  const batch = stepUpWaiters.splice(0);
  for (const waiter of batch) waiter.reject(err);
}

function withBearer(token: string | null | undefined, init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function parseErrorCode(res: Response): Promise<{ code?: string; message?: string }> {
  try {
    const json = (await res.clone().json()) as {
      error?: { code?: string; message?: string };
      message?: string;
    };
    return {
      code: json.error?.code,
      message: json.error?.message ?? json.message,
    };
  } catch {
    return {};
  }
}

/**
 * Fetch with Bearer auth. On 401, refreshes once and retries.
 * On STEP_UP_REQUIRED, waits for UI step-up then retries once.
 */
export async function adminAuthenticatedFetch(
  path: string,
  init: AdminFetchInit,
  isRetry = false,
  stepUpRetried = false
): Promise<Response> {
  const url = apiUrl(path);
  let token = init.token ?? null;
  const { token: _t, ...rest } = init;

  let res = await fetch(url, {
    ...rest,
    credentials: adminFetchCredentials(),
    headers: withBearer(token, rest),
  });

  if (res.status === 401 && !isRetry) {
    const newToken = await useSessionStore.getState().tryRefreshAndReturnNewToken();
    if (newToken !== null) {
      return adminAuthenticatedFetch(
        path,
        { ...init, token: newToken ?? undefined },
        true,
        stepUpRetried
      );
    }
  }

  if (res.status === 403 && !stepUpRetried) {
    const { code } = await parseErrorCode(res);
    if (code === 'STEP_UP_REQUIRED') {
      const store = useSessionStore.getState();
      if (!store.stepUpRequired) {
        store.setStepUpRequired(true);
      }
      void refreshSessionIdleFromBackend();
      await waitForStepUp();
      const latest = useSessionStore.getState().token ?? token ?? undefined;
      return adminAuthenticatedFetch(path, { ...init, token: latest }, isRetry, true);
    }
  }

  return res;
}

export async function adminAuthenticatedJson<T>(
  path: string,
  init: AdminFetchInit
): Promise<{ res: Response; json: T }> {
  const res = await adminAuthenticatedFetch(path, init);
  const json = (await res.json()) as T;
  return { res, json };
}
