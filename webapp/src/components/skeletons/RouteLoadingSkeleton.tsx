'use client';

import { usePathname } from 'next/navigation';
import {
  AnalyticsPageSkeletonInner,
  BlogWritePageSkeletonInner,
  HomePageSkeletonInner,
  ProfilePageSkeletonInner,
} from './page-skeletons';
import { SettingsPageSkeletonInner } from './settings-page-skeleton';

function pickInner(path: string) {
  if (path === '/settings' || path.startsWith('/settings/')) {
    return <SettingsPageSkeletonInner />;
  }
  if (path.startsWith('/profile/analytics')) {
    return <AnalyticsPageSkeletonInner />;
  }
  if (path.startsWith('/profile')) {
    return <ProfilePageSkeletonInner />;
  }
  if (path.startsWith('/blogs/write') || path === '/write' || path.startsWith('/write?')) {
    return <BlogWritePageSkeletonInner />;
  }
  if (path.startsWith('/u/')) {
    return <ProfilePageSkeletonInner variant="public" />;
  }
  return <HomePageSkeletonInner />;
}

/** Next.js `loading.tsx` fallback: structural placeholder for the active route. */
export function RouteLoadingSkeleton() {
  const pathname = usePathname() ?? '';
  return <div className="relative min-h-[50vh] w-full">{pickInner(pathname)}</div>;
}
