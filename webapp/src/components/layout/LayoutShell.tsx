'use client';

import { AppShellChrome } from './AppShellChrome';
import { Footer } from './Footer';
import { MainLayout } from './MainLayout';
import { FloatingActions } from './FloatingActions';
import { FeedbackDialogWrapper } from '@/components/feedback/FeedbackDialogWrapper';
import { NewCustomFeedDialog } from '@/components/home/NewCustomFeedDialog';
import { GridBackground } from '@/components/ui/grid-background';

/**
 * Renders the app chrome immediately. Route transitions use `loading.tsx` + page-level
 * skeletons — an artificial delay here used to cause a generic “dummy” shell before
 * every route-specific skeleton on full load.
 */
export function LayoutShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col">
      {/* Full-shell grid (sidebar + main + under chrome), grows with page height */}
      <GridBackground className="absolute inset-0 z-0 min-h-full" />
      <AppShellChrome />
      <MainLayout className="relative z-[1] min-h-0 flex-1">{children}</MainLayout>
      <Footer />
      <FloatingActions />
      <FeedbackDialogWrapper />
      <NewCustomFeedDialog />
    </div>
  );
}
