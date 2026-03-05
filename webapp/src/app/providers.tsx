'use client';

import { type ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';

/**
 * App providers. AuthProvider exposes auth state for protected pages and account dropdown.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
