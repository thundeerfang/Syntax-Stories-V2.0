'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { refreshAccessToken } from '@/lib/auth/adminSession';
import {
  clearProactiveTokenRefresh,
  scheduleProactiveTokenRefresh,
} from '@/lib/auth/proactiveRefresh';
import { accessTokenNeedsRefresh } from '@/lib/auth/jwtExpiry';
import {
  applySessionIdleStatus,
  clearSessionIdleState,
} from '@/lib/auth/adminSessionIdleSync';

/** Prevents parallel `/auth/refresh` during dashboard load + 401 retries. */
let refreshInFlight: Promise<string | null> | null = null;

function writeAdminPersistSnapshot(snapshot: {
  token: string | null;
  refreshToken: string | null;
  permissions: string[];
  roleName: string | null;
  permVersion: number | null;
  securityZones: string[];
  httpOnlyCookies: boolean;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const state = snapshot.httpOnlyCookies
      ? {
          permissions: snapshot.permissions,
          roleName: snapshot.roleName,
          permVersion: snapshot.permVersion,
          securityZones: snapshot.securityZones,
          httpOnlyCookies: true as const,
        }
      : {
          token: snapshot.token,
          refreshToken: snapshot.refreshToken,
          permissions: snapshot.permissions,
          roleName: snapshot.roleName,
          permVersion: snapshot.permVersion,
          securityZones: snapshot.securityZones,
          httpOnlyCookies: false as const,
        };
    localStorage.setItem(KEY, JSON.stringify({ state, version: 0 }));
  } catch {
    /* ignore */
  }
}

export type AdminSessionIdleStatus = {
  lastActiveAt: string;
  idleExpiresAt: string;
  stepUpVerified: boolean;
  stepUpExpiresAt: string | null;
  confirmationRequired: boolean;
  graceExpiresAt: string | null;
  serverBootId: string;
  idleLimitSeconds: number;
  graceLimitSeconds: number;
};

export type ManagementMePayload = {
  user: {
    _id: string;
    fullName: string;
    username: string;
    email: string;
    staffRole: string | null;
    twoFactorEnabled: boolean;
    twoFactorSetupRequired?: boolean;
  };
  securityZones: string[];
  sessionTier: string | null;
  impersonation: {
    targetUserId: string;
    targetUsername: string | null;
    targetEmail: string | null;
    expiresAt: string;
  } | null;
  httpOnlyCookies?: boolean;
  deviceBindingEnabled?: boolean;
  riskEngineEnabled?: boolean;
  temporalPermissionsEnabled?: boolean;
  rebacEnabled?: boolean;
  passkeyStepUpFeature?: boolean;
  passkeyStepUpEnabled?: boolean;
  passkeyRegistered?: boolean;
  roleName: string | null;
  permissions: string[];
  permVersion: number;
  permHash: string | null;
  sessionIdle?: AdminSessionIdleStatus | null;
};

type SessionState = {
  token: string | null;
  refreshToken: string | null;
  permissions: string[];
  roleName: string | null;
  permVersion: number | null;
  twoFactorSetupRequired: boolean;
  securityZones: string[];
  sessionTier: string | null;
  impersonation: ManagementMePayload['impersonation'];
  httpOnlyCookies: boolean;
  deviceBindingEnabled: boolean;
  riskEngineEnabled: boolean;
  temporalPermissionsEnabled: boolean;
  rebacEnabled: boolean;
  passkeyStepUpFeature: boolean;
  passkeyStepUpEnabled: boolean;
  passkeyRegistered: boolean;
  stepUpRequired: boolean;
  idleDeadlineAt: number | null;
  stepUpGraceDeadlineAt: number | null;
  lastActivityAt: number | null;
  serverBootId: string | null;
  idleLimitSeconds: number | null;
  graceLimitSeconds: number | null;
  hydrated: boolean;
  setSession: (token: string | null, refreshToken: string | null) => void;
  setManagementContext: (ctx: ManagementMePayload) => void;
  setStepUpRequired: (required: boolean) => void;
  applySessionIdle: (status: AdminSessionIdleStatus) => void;
  clearSessionIdle: () => void;
  setHydrated: () => void;
  logout: () => void;
  /** Refresh access JWT using stored refresh token; returns new access token or null. */
  tryRefreshAndReturnNewToken: () => Promise<string | null>;
  hasPermission: (key: string) => boolean;
};

const KEY = 'syntax-stories-admin-session';

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      permissions: [],
      roleName: null,
      permVersion: null,
      twoFactorSetupRequired: false,
      securityZones: [],
      sessionTier: null,
      impersonation: null,
      httpOnlyCookies: process.env.NEXT_PUBLIC_ADMIN_HTTPONLY_COOKIES === 'true',
      deviceBindingEnabled: false,
      riskEngineEnabled: false,
      temporalPermissionsEnabled: false,
      rebacEnabled: false,
      passkeyStepUpFeature: true,
      passkeyStepUpEnabled: false,
      passkeyRegistered: false,
      stepUpRequired: false,
      idleDeadlineAt: null,
      stepUpGraceDeadlineAt: null,
      lastActivityAt: null,
      serverBootId: null,
      idleLimitSeconds: null,
      graceLimitSeconds: null,
      hydrated: false,
      setSession: (token, refreshToken) => {
        const httpOnlyCookies = get().httpOnlyCookies;
        set({ token, refreshToken });
        if (token) scheduleProactiveTokenRefresh(token);
        else if (httpOnlyCookies) scheduleProactiveTokenRefresh(null);
        else clearProactiveTokenRefresh();
      },
      setManagementContext: (ctx) => {
        set({
          permissions: ctx.permissions,
          roleName: ctx.roleName,
          permVersion: ctx.permVersion,
          twoFactorSetupRequired: Boolean(ctx.user.twoFactorSetupRequired),
          securityZones: ctx.securityZones ?? [],
          sessionTier: ctx.sessionTier ?? null,
          impersonation: ctx.impersonation ?? null,
          httpOnlyCookies: Boolean(ctx.httpOnlyCookies),
          deviceBindingEnabled: Boolean(ctx.deviceBindingEnabled),
          riskEngineEnabled: Boolean(ctx.riskEngineEnabled),
          temporalPermissionsEnabled: Boolean(ctx.temporalPermissionsEnabled),
          rebacEnabled: Boolean(ctx.rebacEnabled),
          passkeyStepUpFeature: Boolean(ctx.passkeyStepUpFeature),
          passkeyStepUpEnabled: Boolean(ctx.passkeyStepUpEnabled),
          passkeyRegistered: Boolean(ctx.passkeyRegistered),
        });
        if (ctx.sessionIdle) applySessionIdleStatus(ctx.sessionIdle);
        else clearSessionIdleState();
      },
      setStepUpRequired: (stepUpRequired) => set({ stepUpRequired }),
      applySessionIdle: applySessionIdleStatus,
      clearSessionIdle: clearSessionIdleState,
      setHydrated: () => set({ hydrated: true }),
      logout: () => {
        clearProactiveTokenRefresh();
        clearSessionIdleState();
        set({
          token: null,
          refreshToken: null,
          permissions: [],
          roleName: null,
          permVersion: null,
          twoFactorSetupRequired: false,
          passkeyStepUpEnabled: false,
          passkeyRegistered: false,
          stepUpRequired: false,
          idleDeadlineAt: null,
          stepUpGraceDeadlineAt: null,
          lastActivityAt: null,
          serverBootId: null,
          idleLimitSeconds: null,
          graceLimitSeconds: null,
        });
      },
      tryRefreshAndReturnNewToken: async () => {
        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async (): Promise<string | null> => {
          const state = get();
          const { refreshToken, httpOnlyCookies, token, setSession, logout } = state;
          if (!httpOnlyCookies && !refreshToken) {
            logout();
            return null;
          }
          if (!httpOnlyCookies && !accessTokenNeedsRefresh(token)) {
            return token;
          }
          try {
            const res = await refreshAccessToken(httpOnlyCookies ? null : refreshToken);
            if (!res.success) {
              logout();
              return null;
            }
            if (res.tokensInCookies || httpOnlyCookies) {
              set({ httpOnlyCookies: true });
              scheduleProactiveTokenRefresh(null);
              return '';
            }
            if (!res.accessToken) {
              logout();
              return null;
            }
            const nextRefresh = res.refreshToken ?? refreshToken;
            setSession(res.accessToken, nextRefresh);
            writeAdminPersistSnapshot({
              token: res.accessToken,
              refreshToken: nextRefresh,
              permissions: get().permissions,
              roleName: get().roleName,
              permVersion: get().permVersion,
              securityZones: get().securityZones,
              httpOnlyCookies: false,
            });
            return res.accessToken;
          } catch {
            logout();
            return null;
          }
        })();

        try {
          return await refreshInFlight;
        } finally {
          refreshInFlight = null;
        }
      },
      hasPermission: (key) => get().permissions.includes(key),
    }),
    {
      name: KEY,
      partialize: (s) => {
        if (s.httpOnlyCookies) {
          return {
            permissions: s.permissions,
            roleName: s.roleName,
            permVersion: s.permVersion,
            securityZones: s.securityZones,
            httpOnlyCookies: true,
          };
        }
        return {
          token: s.token,
          refreshToken: s.refreshToken,
          permissions: s.permissions,
          roleName: s.roleName,
          permVersion: s.permVersion,
          securityZones: s.securityZones,
          httpOnlyCookies: false,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.token) scheduleProactiveTokenRefresh(state.token);
        else if (state?.httpOnlyCookies) scheduleProactiveTokenRefresh(null);
        useSessionStore.getState().setHydrated();
      },
    }
  )
);
