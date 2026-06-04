'use client';

import { usePathname } from 'next/navigation';
import { pickRouteSkeleton } from '@/lib/shell/routeSkeleton';

/** Route transition skeleton — used by `LayoutShell` Suspense fallback (and nested `loading.tsx` where kept). */
export function RouteLoadingSkeleton() {
  const pathname = usePathname() ?? '';
  return <div className="relative min-h-[50vh] w-full">{pickRouteSkeleton(pathname)}</div>;
}
