'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function FooterSkeleton() {
  return (
    <footer className="border-t-2 border-border bg-background py-6 sm:py-8">
      <div className="mx-auto max-w-[90rem] space-y-4 px-4 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Skeleton className="h-5 w-28 shrink-0" />
            <Skeleton className="hidden h-4 w-[2px] shrink-0 sm:block" />
            <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-3 w-12" />
              ))}
            </div>
          </div>
          <div className="w-full border-t border-border pt-4 lg:w-auto lg:max-w-md lg:border-t-0 lg:pt-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Skeleton className="h-3 w-40" />
              <div className="flex gap-1">
                <Skeleton className="size-2.5" />
                <Skeleton className="size-2.5" />
                <Skeleton className="size-2.5" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t-2 border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-3 w-64" />
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      </div>
    </footer>
  );
}
