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
  twoFactor: { challengeToken: string; email: string } | null;
  setHydrated: () => void;
  setAuth: (user: AuthUser | null, token: string | null) => void;
  sendLoginOtp: (email: string) => Promise<void>;
  signUp: (fullName: string, email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  verifyTwoFactor: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isHydrated: false,
      twoFactor: null,
      setHydrated: () => set({ isLoading: false, isHydrated: true }),
      setAuth: (user, token) => set({ user, token }),
      sendLoginOtp: async (email: string) => {
        set({ isLoading: true });
        try {
          await authApi.sendOtp({ email });
          set({ isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          const message =
            err instanceof Error ? err.message : 'Failed to send code';
          throw new Error(message);
        }
      },
      signUp: async (fullName: string, email: string) => {
        set({ isLoading: true });
        try {
          await authApi.signupEmail({ fullName, email });
          set({ isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          const message =
            err instanceof Error ? err.message : 'Sign up failed';
          throw new Error(message);
        }
      },
      verifyCode: async (email: string, code: string) => {
        set({ isLoading: true });
        try {
          const res = await authApi.verifyOtp({ email, code });
          if (res.twoFactorRequired && res.challengeToken) {
            set({ twoFactor: { challengeToken: res.challengeToken, email }, isLoading: false });
            return;
          }
          if (!res.accessToken) throw new Error('Login failed');
          const user = normalizeUser(res.user);
          set({ user, token: res.accessToken, isLoading: false, twoFactor: null });
        } catch (err) {
          set({ isLoading: false });
          const message =
            err instanceof Error ? err.message : 'Invalid code';
          throw new Error(message);
        }
      },
      verifyTwoFactor: async (token: string) => {
        const tf = get().twoFactor;
        if (!tf?.challengeToken) throw new Error('2FA challenge missing');
        set({ isLoading: true });
        try {
          const res = await authApi.verifyTwoFactorLogin({ challengeToken: tf.challengeToken, token });
          const user = normalizeUser(res.user);
          set({ user, token: res.accessToken, isLoading: false, twoFactor: null });
        } catch (err) {
          set({ isLoading: false });
          const message =
            err instanceof Error ? err.message : 'Invalid 2FA code';
          throw new Error(message);
        }
      },
      logout: async () => {
        const token = get().token;
        try {
          if (token) await authApi.logout(token);
        } catch {
          /* ignore */
        }
        set({ user: null, token: null, twoFactor: null });
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
