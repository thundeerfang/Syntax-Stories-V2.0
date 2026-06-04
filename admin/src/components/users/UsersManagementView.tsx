'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Stack } from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import { useSessionStore } from '@/store/session';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminTabs } from '@/components/ui/AdminTabs';
import { PlatformAccountsPanel } from './PlatformAccountsPanel';
import { AccessControlPanel } from '@/components/access/AccessControlPanel';
import { AdminTeamPanel } from './AdminTeamPanel';

const TAB_KEYS = ['accounts', 'access', 'team'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const USER_TABS = [
  { label: 'Accounts', icon: GroupsRoundedIcon },
  { label: 'Access control', icon: AdminPanelSettingsRoundedIcon },
  { label: 'Operators', icon: SupportAgentRoundedIcon },
] as const;

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
      <CentricPageHeader
        title="Users"
        description="All webapp user accounts from the User model, RBAC access control, and dashboard operators."
        icon={<PeopleRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Users', '/users')}
      />

      <AdminTabs
        tabs={[...USER_TABS]}
        value={tabIndex}
        onChange={(v) => setTabAndUrl(TAB_KEYS[v] ?? 'accounts')}
      >
        {tab === 'accounts' ? <PlatformAccountsPanel token={token} /> : null}
        {tab === 'access' ? <AccessControlPanel token={token} /> : null}
        {tab === 'team' ? <AdminTeamPanel token={token} /> : null}
      </AdminTabs>
    </Stack>
  );
}

/** `useSearchParams` must be under Suspense for static rendering. */
export function UsersManagementView() {
  return (
    <Suspense
      fallback={
        <Box sx={{ py: 4 }}>
          <CentricPageHeader
            title="Users"
            icon={<PeopleRoundedIcon />}
            breadcrumbs={pageBreadcrumbs('Users', '/users')}
          />
        </Box>
      }
    >
      <UsersManagementViewInner />
    </Suspense>
  );
}
