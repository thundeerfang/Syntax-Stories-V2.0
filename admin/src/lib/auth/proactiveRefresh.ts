import { getJwtExpMs, PROACTIVE_REFRESH_LEAD_MS } from '@/lib/auth/jwtExpiry';
import { useSessionStore } from '@/store/session';

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

const HTTPONLY_REFRESH_INTERVAL_MS = 12 * 60 * 1000;

export function scheduleProactiveTokenRefresh(accessToken: string | null): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  if (!accessToken) {
    if (useSessionStore.getState().httpOnlyCookies) {
      refreshTimer = setTimeout(() => {
        void useSessionStore
          .getState()
          .tryRefreshAndReturnNewToken()
          .then((newToken) => {
            if (newToken !== null) scheduleProactiveTokenRefresh(null);
          });
      }, HTTPONLY_REFRESH_INTERVAL_MS);
    }
    return;
  }

  const expMs = getJwtExpMs(accessToken);
  if (!expMs) return;

  const delay = Math.max(0, expMs - Date.now() - PROACTIVE_REFRESH_LEAD_MS);
  refreshTimer = setTimeout(() => {
    void useSessionStore
      .getState()
      .tryRefreshAndReturnNewToken()
      .then((newToken) => {
        if (newToken !== null) scheduleProactiveTokenRefresh(newToken || null);
      });
  }, delay);
}

export function clearProactiveTokenRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}
