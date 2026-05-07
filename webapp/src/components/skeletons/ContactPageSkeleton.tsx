'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';

/** Matches contact page: rail, two-column grid, form card + sidebar card. */
export function ContactPageSkeletonInner() {
  return (
    <div className={`${SHELL_CONTENT_RAIL_CLASS} py-8 pb-24 md:py-12`}>
      <div className="w-full space-y-8">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] xl:gap-12">
          <div className="space-y-8">
            <div className="space-y-3">
              <Skeleton className="h-3 w-40 rounded-none" />
              <Skeleton className="h-12 w-full max-w-lg rounded-none" />
              <Skeleton className="h-4 w-full max-w-xl rounded-none" />
            </div>

            <section className="border-4 border-border bg-card shadow-[8px_8px_0_0_var(--border)]">
              <div className="flex items-center justify-between border-b-4 border-border bg-muted/30 px-6 py-4">
                <Skeleton className="h-5 w-40 rounded-none" />
                <Skeleton className="size-5 rounded-none" />
              </div>
              <div className="space-y-6 p-6 sm:p-10">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Skeleton className="h-14 w-full rounded-none border-2 border-border/40" />
                  <Skeleton className="h-14 w-full rounded-none border-2 border-border/40" />
                </div>
                <Skeleton className="h-14 w-full rounded-none border-2 border-border/40" />
                <Skeleton className="h-14 w-full rounded-none border-2 border-border/40" />
                <Skeleton className="h-36 w-full rounded-none border-2 border-border/40" />
                <Skeleton className="h-12 w-full rounded-none border-2 border-border/40" />
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="border-4 border-border bg-card shadow-[8px_8px_0_0_var(--border)]">
              <div className="border-b-4 border-border bg-muted/30 px-6 py-4">
                <Skeleton className="h-4 w-28 rounded-none" />
              </div>
              <div className="space-y-4 p-6">
                <Skeleton className="h-4 w-full rounded-none" />
                <Skeleton className="h-4 w-full max-w-sm rounded-none" />
                <Skeleton className="h-20 w-full rounded-none border-2 border-border/30" />
              </div>
            </div>
            <div className="border-4 border-border bg-card p-6 shadow-[6px_6px_0_0_var(--border)]">
              <Skeleton className="h-3 w-24 rounded-none" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Skeleton className="h-8 w-20 rounded-none" />
                <Skeleton className="h-8 w-16 rounded-none" />
                <Skeleton className="h-8 w-24 rounded-none" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
