'use client';

import { useAuthStore } from '@/store/auth';
import { useShallow } from 'zustand/react/shallow';

export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      user: s.user,
      token: s.token,
      isAuthenticated: !!s.token,
      isLoading: s.isLoading,
      twoFactor: s.twoFactor,
      sendLoginOtp: s.sendLoginOtp,
      signUp: s.signUp,
      verifyCode: s.verifyCode,
      verifyTwoFactor: s.verifyTwoFactor,
      logout: s.logout,
    }))
  );
}
