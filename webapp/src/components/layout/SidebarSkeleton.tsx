'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function SidebarSkeleton() {
  return (
    <aside
      className="fixed left-0 z-20 flex w-60 flex-col border-r-2 border-border bg-background bottom-0 overflow-hidden"
      style={{ top: 'var(--header-height)' }}
      aria-hidden
    >
      <div className="p-4 border-b-2 border-border">
        <Skeleton className="h-10 w-full" />
      </div>
      <nav className="flex-1 p-4 space-y-6">
        <ul className="space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <li key={i}>
              <Skeleton className="h-9 w-full" />
            </li>
          ))}
        </ul>
        <div className="space-y-3">
          <Skeleton className="h-3 w-24 mx-3" />
          <ul className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <li key={i}>
                <Skeleton className="h-8 w-full" />
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-28 mx-3" />
          <ul className="space-y-1">
            {[1, 2, 3].map((i) => (
              <li key={i}>
                <Skeleton className="h-8 w-full" />
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
