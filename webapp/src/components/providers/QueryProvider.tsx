'use client';

import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * TanStack Query for profile/settings mutations and future server-state caching.
 * Default options keep errors on the mutation object (callers use toast etc.).
 */
export function QueryProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1 },
          mutations: { retry: 0 },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
