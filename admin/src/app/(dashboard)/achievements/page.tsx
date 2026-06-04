'use client';

import { useMemo, useState } from 'react';
import { Stack } from '@mui/material';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminTabs } from '@/components/ui/AdminTabs';
import { AchievementsCatalogPanel } from '@/components/achievements/AchievementsCatalogPanel';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

export default function AchievementsPage() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const permissions = useSessionStore((s) => s.permissions);
  const roleName = useSessionStore((s) => s.roleName);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const [tab, setTab] = useState(0);

  const roleLower = roleName?.toLowerCase() ?? '';
  const canManage =
    permissions.length === 0 ||
    hasPermission('achievement:manage') ||
    hasPermission('admin_role:manage') ||
    roleLower === 'super admin' ||
    roleLower === 'platform admin';

  const tabs = useMemo(
    () => [{ label: 'Catalog', icon: TableChartRoundedIcon }],
    []
  );

  return (
    <Stack spacing={2}>
      <CentricPageHeader
        title="Achievements"
        description="Configure achievement definitions, link them to platform modules, and control what users see on the webapp."
        icon={<EmojiEventsRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Achievements', '/achievements')}
      />

      <AdminTabs tabs={tabs} value={tab} onChange={setTab}>
        {tab === 0 ? <AchievementsCatalogPanel token={apiToken} canManage={canManage} /> : null}
      </AdminTabs>
    </Stack>
  );
}
