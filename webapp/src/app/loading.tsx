'use client';

import { usePathname } from 'next/navigation';
import { TerminalLoaderPage } from '@/components/loader';

/**
 * Root Suspense fallback. Skip the extra terminal shell on OAuth callback routes — they own a single completing loader.
 */
export default function RootLoading() {
  const pathname = usePathname() ?? '';
  if (pathname.includes('-callback')) return null;
  return <TerminalLoaderPage pageName="app" />;
}
