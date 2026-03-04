'use client';

import { type ReactNode } from 'react';

/**
 * App providers. State is managed by Zustand stores (auth, theme, sidebar).
 * No provider wrappers needed.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
