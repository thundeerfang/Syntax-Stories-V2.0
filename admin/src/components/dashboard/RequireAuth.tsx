'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { fetchMe } from '@/lib/api';
import { fetchManagementMe } from '@/admin/api/management';
import { TwoFactorSetupFlow } from '@/components/auth/TwoFactorSetupFlow';
import { isAdminAuthActive } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

async function verifyStaffAccess(accessToken: string | null): Promise<boolean> {
  const me = await fetchMe(accessToken);
  const role = me.user.staffRole;
  return role === 'editor' || role === 'admin';
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const hydrated = useSessionStore((s) => s.hydrated);
  const logout = useSessionStore((s) => s.logout);
  const tryRefresh = useSessionStore((s) => s.tryRefreshAndReturnNewToken);
  const setManagementContext = useSessionStore((s) => s.setManagementContext);
  const twoFactorSetupRequired = useSessionStore((s) => s.twoFactorSetupRequired);
  const [gate, setGate] = useState<'idle' | 'ok'>('idle');

  useEffect(() => {
    if (!hydrated) return;
    if (!isAdminAuthActive(token, httpOnlyCookies)) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    setGate('idle');

    (async () => {
      let accessToken = httpOnlyCookies ? null : token;
      try {
        if (!(await verifyStaffAccess(accessToken))) {
          if (!cancelled) {
            logout();
            router.replace('/login');
          }
          return;
        }
        const mgmt = await fetchManagementMe(accessToken);
        if (cancelled) return;
        setManagementContext(mgmt);
        setGate('ok');
      } catch {
        const refreshed = await tryRefresh();
        if (cancelled) return;
        if (!refreshed) {
          logout();
          router.replace('/login');
          return;
        }
        try {
          if (!(await verifyStaffAccess(refreshed))) {
            logout();
            router.replace('/login');
            return;
          }
          const mgmt = await fetchManagementMe(refreshed);
          if (cancelled) return;
          setManagementContext(mgmt);
          setGate('ok');
        } catch {
          if (!cancelled) {
            logout();
            router.replace('/login');
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, token, httpOnlyCookies, router, logout, tryRefresh, setManagementContext]);

  if (!hydrated || !isAdminAuthActive(token, httpOnlyCookies) || gate !== 'ok') {
    return (
      <Box
        className="flex min-h-screen items-center justify-center"
        sx={{ bgcolor: 'background.default' }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (twoFactorSetupRequired) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <TwoFactorSetupFlow />
      </Box>
    );
  }

  return <>{children}</>;
}
