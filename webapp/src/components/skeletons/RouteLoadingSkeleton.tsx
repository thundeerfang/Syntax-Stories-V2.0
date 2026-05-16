'use client';

import { usePathname } from 'next/navigation';
import {
  AnalyticsPageSkeletonInner,
  BlogWritePageSkeletonInner,
  HomePageSkeletonInner,
  ProfilePageSkeletonInner,
} from './page-skeletons';
import { FollowingPageContentSkeleton } from './FollowingPageSkeleton';
import { BlogPostPageSkeletonInner } from './BlogPostPageSkeleton';
import { SettingsPageSkeletonInner } from './settings-page-skeleton';
import { DocsPageSkeletonInner } from './DocsPageSkeleton';
import { ContactPageSkeletonInner } from './ContactPageSkeleton';

function pickInner(path: string) {
  if (path === '/following' || path === '/bookmarks' || path === '/reposts') {
    return <FollowingPageContentSkeleton showIntro />;
  }
  if (path === '/docs' || path.startsWith('/docs/')) {
    return <DocsPageSkeletonInner />;
  }
  if (path === '/contact' || path.startsWith('/contact/')) {
    return <ContactPageSkeletonInner />;
  }
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
  if (path.startsWith('/blogs/')) {
    const segments = path.split('/').filter(Boolean);
    if (segments.length >= 3 && segments[0] === 'blogs' && segments[1] !== 'write') {
      return <BlogPostPageSkeletonInner />;
    }
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
