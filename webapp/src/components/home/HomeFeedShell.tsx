'use client';

import { Suspense } from 'react';
import { HomeDashboard } from '@/components/home/HomeDashboard';

function HomeFeedShellSkeleton() {
  return (
    <div className="w-full min-w-0">
      <div className="relative mx-auto w-full min-w-0 max-w-[min(100%,87.5rem)] shrink-0 pt-8 md:pt-10">
        <div className="px-4 md:px-8">
          <div className="w-full min-w-0 overflow-hidden rounded-sm border-2 border-border bg-muted/40">
            <div className="min-h-[min(56dvh,520px)] w-full animate-pulse bg-muted-foreground/10" />
          </div>
        </div>
      </div>
      <div className="relative mx-auto w-full min-w-0 max-w-[min(100%,87.5rem)] py-10 md:py-12">
        <div className="space-y-6 px-4 md:px-8">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-24 shrink-0 animate-pulse rounded-full border-2 border-border bg-muted/40" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[280px] animate-pulse border-2 border-border bg-muted/40 shadow-[4px_4px_0_0_var(--border)]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeFeedShellInner() {
  return <HomeDashboard />;
}

export function HomeFeedShell() {
  return (
    <Suspense fallback={<HomeFeedShellSkeleton />}>
      <HomeFeedShellInner />
    </Suspense>
  );
}
