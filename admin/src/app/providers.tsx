'use client';

import { useEffect } from 'react';
import { useSessionStore } from '@/store/session';

export function Providers({ children }: { children: React.ReactNode }) {
  const setHydrated = useSessionStore((s) => s.setHydrated);

  useEffect(() => {
    setHydrated();
  }, [setHydrated]);

  return children;
}
