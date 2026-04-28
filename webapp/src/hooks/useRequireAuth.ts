'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

/**
 * Use on protected pages (settings, profile, etc.).
 * - Redirects to /login when not authenticated (after hydration).
 * - Validates token on mount (calls refreshUser so expired token is detected and state cleared).
 * - Returns auth state; while loading or not authenticated, caller should show loading or null.
 */
export function useRequireAuth() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const user = useAuthStore((s) => s.user);
  const didValidate = useRef(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!didValidate.current) {
      didValidate.current = true;
      refreshUser();
    }
  }, [isHydrated, token, router, refreshUser]);

  const isAuthenticated = !!token;
  const shouldBlock = isHydrated && !token;

  return {
    user,
    token,
    isHydrated,
    isAuthenticated,
    shouldBlock,
  };
}
