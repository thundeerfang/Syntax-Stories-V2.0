'use client';

import { Stack } from '@mui/material';
import SubscriptionsRoundedIcon from '@mui/icons-material/SubscriptionsRounded';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { SubscriptionPlansPanel } from '@/components/subscriptions/SubscriptionPlansPanel';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

export default function SubscriptionsPage() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const permissions = useSessionStore((s) => s.permissions);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const canManage =
    permissions.length === 0 ||
    hasPermission('billing:manage_plans') ||
    hasPermission('billing:sync_subscription');

  return (
    <Stack spacing={2}>
      <CentricPageHeader
        title="Subscriptions"
        description="Manage paid plans shown on the public pricing page. Edit copy, set most popular, or add Pro / Pro Plus / Ultra slots."
        icon={<SubscriptionsRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Subscriptions', '/subscriptions')}
      />

      <SubscriptionPlansPanel token={apiToken} canManage={canManage} />
    </Stack>
  );
}
