'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

/**
 * Ensures auth store is hydrated from localStorage before rendering auth-dependent UI.
 * Must be mounted inside the app (e.g. in layout).
 */
export function StoreHydration() {
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    setHydrated();
  }, [setHydrated]);

  return null;
}
