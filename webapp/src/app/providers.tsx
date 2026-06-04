'use client';

import { type ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { QueryProvider } from '@/components/providers/QueryProvider';

/**
 * App providers. AuthProvider exposes auth state; QueryProvider enables TanStack Query (e.g. profile mutations).
 */
export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
