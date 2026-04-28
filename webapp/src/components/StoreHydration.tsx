'use client';

import { useEffect } from 'react';
import { setAuthRetryHandler } from '@/api/auth';
import { sessionPing } from '@/api/sessionPing';
import { useAuthStore } from '@/store/auth';

/**
 * Ensures auth store is hydrated from localStorage before rendering auth-dependent UI.
 * Registers global 401 retry so expired access tokens are refreshed and the request is retried.
 * After hydration, refreshes the access token when a refresh token exists so a normal reload
 * does not leave the client on an expired bearer until the next failed request.
 */
export function StoreHydration() {
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    setHydrated();
    setAuthRetryHandler(() => useAuthStore.getState().tryRefreshAndReturnNewToken());
    void (async () => {
      const { refreshToken, tryRefreshAndReturnNewToken } = useAuthStore.getState();
      if (!refreshToken) return;
      const t = await tryRefreshAndReturnNewToken();
      if (t) {
        try {
          await sessionPing(t);
        } catch {
          /* optional sanity check — refresh already updated the store */
        }
      }
    })();
    return () => setAuthRetryHandler(null);
  }, [setHydrated]);

  return null;
}
