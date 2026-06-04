'use client';

import { useEffect } from 'react';
import { setAuthRetryHandler } from '@/api/auth';
import { sessionPing } from '@/api/sessionPing';
import { accessTokenNeedsRefresh } from '@/lib/auth/jwtExpiry';
import { attachSystemThemeListener } from '@/store/theme';
import { useAuthStore } from '@/store/auth';

/**
 * Ensures auth store is hydrated from localStorage before rendering auth-dependent UI.
 * Registers global 401 retry so expired access tokens are refreshed and the request is retried.
 * After hydration, refreshes only when the access JWT is missing or near expiry (avoids rotating
 * the refresh token on every hard reload, which can log users out).
 */
export function StoreHydration() {
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    attachSystemThemeListener();
    setHydrated();
    const hydrateFailsafe = window.setTimeout(() => {
      if (!useAuthStore.getState().isHydrated) {
        useAuthStore.getState().setHydrated();
      }
    }, 750);
    setAuthRetryHandler(() => useAuthStore.getState().tryRefreshAndReturnNewToken());
    void (async () => {
      const { refreshToken, token, tryRefreshAndReturnNewToken } = useAuthStore.getState();
      if (!refreshToken) return;
      if (!accessTokenNeedsRefresh(token)) return;
      const t = await tryRefreshAndReturnNewToken();
      if (t) {
        try {
          await sessionPing(t);
        } catch {
          /* optional sanity check — refresh already updated the store */
        }
      }
    })();
    return () => {
      window.clearTimeout(hydrateFailsafe);
      setAuthRetryHandler(null);
    };
  }, [setHydrated]);

  return null;
}
