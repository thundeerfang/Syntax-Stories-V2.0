'use client';

import { Stack, Typography } from '@mui/material';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { FaqPanel } from '@/components/help/FaqPanel';
import { useSessionStore } from '@/store/session';

export default function FaqPage() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const permissionsLoaded = useSessionStore((s) => s.permissions.length > 0);
  const canManageFaq = !permissionsLoaded || hasPermission('help:manage');

  return (
    <Stack spacing={2}>
      <CentricPageHeader
        title="FAQ"
        description="Create, edit, and publish FAQ items for the public /help page."
        icon={<QuizRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('FAQ', '/help')}
      />

      {canManageFaq ? (
        <FaqPanel />
      ) : (
        <Typography variant="body2" color="text.secondary">
          You do not have permission to manage FAQ content.
        </Typography>
      )}
    </Stack>
  );
}
