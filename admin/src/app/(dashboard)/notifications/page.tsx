'use client';

import { Stack } from '@mui/material';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { NotificationsAdminPanel } from '@/components/notifications/NotificationsAdminPanel';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

export default function NotificationsAdminPage() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const canManage = hasPermission('notification:manage');

  return (
    <Stack spacing={2}>
      <CentricPageHeader
        title="Notifications"
        description="Super Admin only — platform webhook delivery, delivery audit, and inbox metrics. End users control in-app alert categories in their account settings."
        icon={<NotificationsActiveRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Notifications', '/notifications')}
      />
      <NotificationsAdminPanel token={apiToken} canManage={canManage} />
    </Stack>
  );
}
