'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AppShellChrome } from './AppShellChrome';
import { MainLayout } from './MainLayout';
import { FloatingActions } from './FloatingActions';
import { FeedbackDialogWrapper, NewCustomFeedDialog } from './_layoutShellOverlays';
import { GridBackground } from '@/components/ui/media/grid-background';
import { RouteLoadingSkeleton } from '@/components/skeletons';
import { isOAuthBrowserCallbackPath } from '@/lib/auth/oauthNavigation';


function MainRouteFallback() {
  const pathname = usePathname() ?? '';
  if (isOAuthBrowserCallbackPath(pathname)) return null;
  return <RouteLoadingSkeleton />;
}

/** App chrome + main column; Suspense shows route skeletons while pages load. */
export function LayoutShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col">
      <GridBackground className="absolute inset-0 z-0 min-h-full" />
      <AppShellChrome />
      <MainLayout className="relative z-[1] min-h-0 flex-1">
        <Suspense fallback={<MainRouteFallback />}>{children}</Suspense>
      </MainLayout>
      <FloatingActions />
      <FeedbackDialogWrapper />
      <NewCustomFeedDialog />
    </div>
  );
}
