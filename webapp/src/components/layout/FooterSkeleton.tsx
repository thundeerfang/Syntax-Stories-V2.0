'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function FooterSkeleton() {
  return (
    <footer className="border-t-2 border-border bg-background py-8">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-8 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="hidden sm:block h-4 w-[2px]" />
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-3 w-12" />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-40" />
            <div className="flex gap-1">
              <Skeleton className="size-2" />
              <Skeleton className="size-2" />
              <Skeleton className="size-2" />
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t-2 border-border/50">
          <Skeleton className="h-3 w-64" />
          <div className="flex gap-6">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </footer>
  );
}
