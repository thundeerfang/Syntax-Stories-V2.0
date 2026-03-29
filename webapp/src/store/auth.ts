'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  authApi,
  AuthError,
  normalizeUser,
  type AuthUser,
  type ProfileUpdateSection,
  type UpdateProfilePayload,
} from '@/api/auth';
import { setLastUserName } from '@/lib/lastUser';

const AUTH_KEY = 'syntax-stories-auth';

async function recoverSessionAfterGetAccount401(
  get: () => AuthState,
  set: (partial: Partial<AuthState>) => void,
): Promise<void> {
  const refreshToken = get().refreshToken;
  if (!refreshToken) {
    set({ user: null, token: null, refreshToken: null });
    return;
  }
  try {
    const refreshed = await authApi.refresh(refreshToken);
    set({ token: refreshed.accessToken });
    const res = await authApi.getAccount(refreshed.accessToken);
    set({ user: normalizeUser(res.user) });
  } catch (refreshErr) {
    if (refreshErr instanceof AuthError && refreshErr.status === 401) {
      const rt = get().refreshToken;
      try {
        if (rt) await authApi.revokeSession(rt);
      } catch {
        /* ignore */
      }
      set({ user: null, token: null, refreshToken: null });
    }
  }
}

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  twoFactor: { challengeToken: string; email: string } | null;
  /** Latest OTP generation from send/signup; paired with verify-otp. */
  pendingOtpVersion: number | null;
  setHydrated: () => void;
  setAuth: (user: AuthUser | null, token: string | null, refreshToken?: string | null) => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: UpdateProfilePayload, opts?: { section?: ProfileUpdateSection }) => Promise<void>;
  sendLoginOtp: (email: string, altcha?: string) => Promise<void>;
  signUp: (fullName: string, email: string, altcha?: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  verifyTwoFactor: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Used by auth API 401 retry: try refresh and return new access token or null. */
  tryRefreshAndReturnNewToken: () => Promise<string | null>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: true,
      isHydrated: false,
      twoFactor: null,
      pendingOtpVersion: null,
      setHydrated: () => set({ isLoading: false, isHydrated: true }),
      setAuth: (user, token, refreshToken = null) => {
        if (user?.fullName) setLastUserName(user.fullName);
        set({ user, token, refreshToken: refreshToken ?? null });
      },
      refreshUser: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const res = await authApi.getAccount(token);
          set({ user: normalizeUser(res.user) });
        } catch (e) {
          if (e instanceof AuthError && e.status === 401) {
            await recoverSessionAfterGetAccount401(get, set);
          }
        }
      },
      updateProfile: async (data: UpdateProfilePayload, opts?: { section?: ProfileUpdateSection }) => {
        const { token, refreshToken } = get();
        if (!token) throw new Error('Not logged in');
        const section = opts?.section;
        const patch = section
          ? (t: string) => authApi.updateProfileSection(t, section, data)
          : (t: string) => authApi.updateProfile(t, data);
        try {
          const res = await patch(token);
          set({ user: normalizeUser(res.user) });
        } catch (e) {
          if (e instanceof AuthError && e.status === 401 && refreshToken) {
            const refreshed = await authApi.refresh(refreshToken);
            set({ token: refreshed.accessToken });
            const res = await patch(refreshed.accessToken);
            set({ user: normalizeUser(res.user) });
            return;
          }
          throw e;
        }
      },
      sendLoginOtp: async (email: string, altcha?: string) => {
        set({ isLoading: true });
        try {
          const out = await authApi.sendOtp({ email, altcha });
          set({
            isLoading: false,
            pendingOtpVersion: typeof out.otpVersion === 'number' ? out.otpVersion : null,
          });
        } catch (err) {
          set({ isLoading: false });
          const message =
            err instanceof Error ? err.message : 'Failed to send code';
          throw new Error(message);
        }
      },
      signUp: async (fullName: string, email: string, altcha?: string) => {
        set({ isLoading: true });
        try {
          const out = await authApi.signupEmail({ fullName, email, altcha });
          set({
            isLoading: false,
            pendingOtpVersion: typeof out.otpVersion === 'number' ? out.otpVersion : null,
          });
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
          const otpVersion = get().pendingOtpVersion;
          const res = await authApi.verifyOtp({
            email,
            code,
            ...(typeof otpVersion === 'number' ? { otpVersion } : {}),
          });
          if (res.twoFactorRequired && res.challengeToken) {
            set({
              twoFactor: {
                challengeToken: res.challengeToken,
                email: res.email ?? res.user?.email ?? email,
              },
              isLoading: false,
              pendingOtpVersion: null,
            });
            return;
          }
          if (!res.accessToken || !res.user) throw new Error('Login failed');
          const user = normalizeUser(res.user);
          set({
            user,
            token: res.accessToken,
            refreshToken: res.refreshToken ?? null,
            isLoading: false,
            twoFactor: null,
            pendingOtpVersion: null,
          });
          if (user?.fullName) setLastUserName(user.fullName);
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
          set({ user, token: res.accessToken, refreshToken: res.refreshToken ?? null, isLoading: false, twoFactor: null });
          if (user?.fullName) setLastUserName(user.fullName);
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
        set({ user: null, token: null, refreshToken: null, twoFactor: null });
      },
      tryRefreshAndReturnNewToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return null;
        try {
          const res = await authApi.refresh(refreshToken);
          set({ token: res.accessToken });
          // Re-fetch user so connected-accounts and OAuth flags stay correct after silent refresh
          try {
            const accountRes = await authApi.getAccount(res.accessToken);
            set({ user: normalizeUser(accountRes.user) });
          } catch {
            /* keep existing user if /me fails after refresh */
          }
          return res.accessToken;
        } catch (e) {
          // Only clear auth state when refresh returns 401 (session invalid/expired).
          // On network error, 5xx, or 429 we keep the user "logged in" so they can retry.
          if (e instanceof AuthError && e.status === 401) {
            const rt = get().refreshToken;
            try {
              if (rt) await authApi.revokeSession(rt);
            } catch {
              /* ignore */
            }
            set({ user: null, token: null, refreshToken: null });
          }
          return null;
        }
      },
    }),
    {
      name: AUTH_KEY,
      partialize: (s) => ({ user: s.user, token: s.token, refreshToken: s.refreshToken }),
      onRehydrateStorage: () => () => {
        useAuthStore.getState().setHydrated();
      },
    }
  )
);
