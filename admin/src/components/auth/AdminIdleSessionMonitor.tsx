'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAdminAuthActive, resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { syncSessionIdle, touchBackendSession } from '@/lib/auth/adminSessionIdleSync';
import { useSessionStore } from '@/store/session';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
const ACTIVITY_THROTTLE_MS = 15_000;
const SYNC_INTERVAL_MS = 30_000;
const TICK_MS = 1000;

/**
 * Syncs idle countdown from the backend. After 60 minutes without input, backend requires step-up 2FA.
 * Server restart / Redis flush resets boot ack and re-prompts confirmation.
 */
export function AdminIdleSessionMonitor() {
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const idleDeadlineAt = useSessionStore((s) => s.idleDeadlineAt);
  const stepUpRequired = useSessionStore((s) => s.stepUpRequired);
  const logout = useSessionStore((s) => s.logout);
  const lastTouchRef = useRef(0);

  const authed = isAdminAuthActive(token, httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const idleEnabled = authed && idleDeadlineAt !== null;

  useEffect(() => {
    if (!idleEnabled) return;
    void syncSessionIdle(apiToken);

    const syncInterval = window.setInterval(() => {
      void syncSessionIdle(apiToken);
    }, SYNC_INTERVAL_MS);

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void syncSessionIdle(apiToken);
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [idleEnabled, apiToken]);

  useEffect(() => {
    if (!idleEnabled || stepUpRequired) return;

    function onActivity() {
      const now = Date.now();
      if (now - lastTouchRef.current < ACTIVITY_THROTTLE_MS) return;
      lastTouchRef.current = now;
      void touchBackendSession(apiToken);
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [idleEnabled, stepUpRequired, apiToken]);

  useEffect(() => {
    if (!idleEnabled) return;

    const interval = window.setInterval(() => {
      const state = useSessionStore.getState();
      if (state.stepUpRequired) {
        const grace = state.stepUpGraceDeadlineAt;
        if (grace && Date.now() >= grace) {
          logout();
          router.replace('/login');
        }
        return;
      }

      if (state.idleDeadlineAt && Date.now() >= state.idleDeadlineAt) {
        void syncSessionIdle(apiToken);
      }
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [idleEnabled, apiToken, logout, router]);

  return null;
}
