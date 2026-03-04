'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, normalizeUser, type AuthUser } from '@/api/auth';

const AUTH_KEY = 'syntax-stories-auth';

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  setHydrated: () => void;
  setAuth: (user: AuthUser | null, token: string | null) => void;
  sendLoginOtp: (email: string) => Promise<void>;
  signUp: (fullName: string, email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isHydrated: false,
      setHydrated: () => set({ isLoading: false, isHydrated: true }),
      setAuth: (user, token) => set({ user, token }),
      sendLoginOtp: async (email: string) => {
        set({ isLoading: true });
        try {
          await authApi.sendOtp({ email });
          set({ isLoading: false });
        } catch {
          set({ isLoading: false });
          throw new Error('Failed to send code');
        }
      },
      signUp: async (fullName: string, email: string) => {
        set({ isLoading: true });
        try {
          await authApi.signupEmail({ fullName, email });
          set({ isLoading: false });
        } catch {
          set({ isLoading: false });
          throw new Error('Sign up failed');
        }
      },
      verifyCode: async (email: string, code: string) => {
        set({ isLoading: true });
        try {
          const res = await authApi.verifyOtp({ email, code });
          const user = normalizeUser(res.user);
          set({ user, token: res.accessToken, isLoading: false });
        } catch {
          set({ isLoading: false });
          throw new Error('Invalid code');
        }
      },
      logout: async () => {
        const token = get().token;
        try {
          if (token) await authApi.logout(token);
        } catch {
          /* ignore */
        }
        set({ user: null, token: null });
      },
    }),
    {
      name: AUTH_KEY,
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => () => {
        useAuthStore.getState().setHydrated();
      },
    }
  )
);
