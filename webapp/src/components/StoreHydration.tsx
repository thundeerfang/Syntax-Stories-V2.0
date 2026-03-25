'use client';

import { useEffect } from 'react';
import { setAuthRetryHandler } from '@/api/auth';
import { useAuthStore } from '@/store/auth';

/**
 * Ensures auth store is hydrated from localStorage before rendering auth-dependent UI.
 * Registers global 401 retry so expired access tokens are refreshed and the request is retried.
 */
export function StoreHydration() {
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    setHydrated();
    setAuthRetryHandler(() => useAuthStore.getState().tryRefreshAndReturnNewToken());
    return () => setAuthRetryHandler(null);
  }, [setHydrated]);

  return null;
}
