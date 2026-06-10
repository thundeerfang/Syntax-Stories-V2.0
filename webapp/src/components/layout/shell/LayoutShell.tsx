'use client';

import { AppShellChrome } from './AppShellChrome';
import { MainLayout } from './MainLayout';
import { FloatingActions } from './FloatingActions';
import { FeedbackDialogWrapper, NewCustomFeedDialog } from './_layoutShellOverlays';
import { GridBackground } from '@/components/ui/media/grid-background';
import { DesktopShellInit } from './DesktopShellInit';

/** App chrome + main column. Route `loading.tsx` files handle per-page loading states. */
export function LayoutShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col">
      <DesktopShellInit />
      <GridBackground className="absolute inset-0 z-0 min-h-full" />
      <AppShellChrome />
      <MainLayout className="relative z-[1] min-h-0 flex-1">{children}</MainLayout>
      <FloatingActions />
      <FeedbackDialogWrapper />
      <NewCustomFeedDialog />
    </div>
  );
}
