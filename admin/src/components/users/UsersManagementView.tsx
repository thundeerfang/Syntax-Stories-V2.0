'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Paper, Stack, Tab, Tabs } from '@mui/material';
import { useSessionStore } from '@/store/session';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { PlatformAccountsPanel } from './PlatformAccountsPanel';
import { AccessControlPanel } from '@/components/access/AccessControlPanel';
import { AdminTeamPanel } from './AdminTeamPanel';

const TAB_KEYS = ['accounts', 'access', 'team'] as const;
type TabKey = (typeof TAB_KEYS)[number];

function tabFromQuery(raw: string | null): TabKey {
  if (raw === 'access' || raw === 'team') return raw;
  return 'accounts';
}

function UsersManagementViewInner() {
  const token = useSessionStore((s) => s.token);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>(() => tabFromQuery(searchParams.get('tab')));

  useEffect(() => {
    setTab(tabFromQuery(searchParams.get('tab')));
  }, [searchParams]);

  const setTabAndUrl = useCallback(
    (next: TabKey) => {
      setTab(next);
      const q = next === 'accounts' ? '' : `?tab=${next}`;
      router.replace(`${pathname ?? '/users'}${q}`, { scroll: false });
    },
    [router, pathname]
  );

  const tabIndex = tab === 'access' ? 1 : tab === 'team' ? 2 : 0;

  return (
    <Stack spacing={3}>
      <DashboardPageHeader
        title="Users"
        subtitle="Customer accounts, role definitions, and dashboard operators in one place."
      />

      <Paper
        elevation={0}
        className="border border-[var(--color-border)]"
        sx={{ borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
      >
        <Tabs
          value={tabIndex}
          onChange={(_, v) => {
            const key = TAB_KEYS[v] ?? 'accounts';
            setTabAndUrl(key);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 },
          }}
        >
          <Tab label="Platform accounts" disableRipple />
          <Tab label="Access" disableRipple />
          <Tab label="Admin team" disableRipple />
        </Tabs>
        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          {tab === 'accounts' ? <PlatformAccountsPanel token={token} /> : null}
          {tab === 'access' ? <AccessControlPanel token={token} /> : null}
          {tab === 'team' ? <AdminTeamPanel token={token} /> : null}
        </Box>
      </Paper>
    </Stack>
  );
}

/** `useSearchParams` must be under Suspense for static rendering. */
export function UsersManagementView() {
  return (
    <Suspense
      fallback={
        <Box sx={{ py: 4 }}>
          <DashboardPageHeader title="Users" />
        </Box>
      }
    >
      <UsersManagementViewInner />
    </Suspense>
  );
}
