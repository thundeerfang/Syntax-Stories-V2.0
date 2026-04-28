'use client';

import { usePathname } from 'next/navigation';
import { RouteLoadingSkeleton } from '@/components/skeletons';
import { isOAuthBrowserCallbackPath } from '@/lib/oauthNavigation';

/**
 * Root Suspense fallback. Skip the extra terminal shell on OAuth callback routes — they own a single completing loader.
 */
export default function RootLoading() {
  const pathname = usePathname() ?? '';
  if (isOAuthBrowserCallbackPath(pathname)) return null;
  return <RouteLoadingSkeleton />;
}
