'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { fetchMe } from '@/lib/api';
import { useSessionStore } from '@/store/session';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const hydrated = useSessionStore((s) => s.hydrated);
  const logout = useSessionStore((s) => s.logout);
  const [gate, setGate] = useState<'idle' | 'ok'>('idle');

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    setGate('idle');
    (async () => {
      try {
        const me = await fetchMe(token);
        if (cancelled) return;
        const role = me.user.staffRole;
        if (role !== 'editor' && role !== 'admin') {
          logout();
          router.replace('/login');
          return;
        }
        setGate('ok');
      } catch {
        if (!cancelled) {
          logout();
          router.replace('/login');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, token, router, logout]);

  if (!hydrated || !token || gate !== 'ok') {
    return (
      <Box
        className="flex min-h-screen items-center justify-center"
        sx={{ bgcolor: 'background.default' }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return <>{children}</>;
}
