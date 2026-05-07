'use client';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { RequireAuth } from '@/components/dashboard/RequireAuth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <DashboardShell>{children}</DashboardShell>
    </RequireAuth>
  );
}
