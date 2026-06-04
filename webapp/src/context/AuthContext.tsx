'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useAuthStore } from '@/store/auth';

type AuthContextValue = {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  token: string | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isHydrated,
      isAuthenticated: !!token,
    }),
    [user, token, isHydrated]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}
