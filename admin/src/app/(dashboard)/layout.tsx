'use client';

import { Box } from '@mui/material';
import { ImpersonationBanner } from '@/components/auth/ImpersonationBanner';
import { AdminIdleSessionMonitor } from '@/components/auth/AdminIdleSessionMonitor';
import { StepUpDialogHost } from '@/components/auth/StepUpDialogHost';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { RequireAuth } from '@/components/dashboard/RequireAuth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AdminIdleSessionMonitor />
      <StepUpDialogHost />
      <Box
        sx={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <ImpersonationBanner />
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <DashboardShell>{children}</DashboardShell>
        </Box>
      </Box>
    </RequireAuth>
  );
}
