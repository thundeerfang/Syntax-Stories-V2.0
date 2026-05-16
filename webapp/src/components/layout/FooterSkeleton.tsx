'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function FooterSkeleton() {
  return (
    <footer className="border-t-2 border-border bg-background py-6 sm:py-8">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-3 w-64" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-14" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-3 shrink-0" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
