'use client';

import { Skeleton } from '@/components/ui/Skeleton';

const MIN = 'min-h-[calc(100vh-var(--header-height))]';

/** Matches `docs/layout` chrome: frame, sidebar rail, breadcrumb strip, prose blocks. */
export function DocsPageSkeletonInner() {
  return (
    <div className={`flex w-full flex-col ${MIN}`}>
      <div
        className={`mx-auto flex w-full max-w-[1440px] flex-1 flex-col border-4 border-border bg-card shadow-[8px_8px_0_0_var(--border)] ${MIN}`}
      >
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="hidden w-72 shrink-0 flex-col gap-4 border-border bg-card/50 p-4 lg:flex lg:border-r-4">
            <div className="space-y-2 border-b-4 border-border pb-4">
              <Skeleton className="h-4 w-16 rounded-none" />
              <Skeleton className="h-3 w-28 rounded-none" />
            </div>
            <Skeleton className="h-9 w-full rounded-none border-2 border-border/40" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-3 w-24 rounded-none" />
              <Skeleton className="h-10 w-full rounded-none border-2 border-border/40" />
              <Skeleton className="h-10 w-full rounded-none border-2 border-border/40" />
              <Skeleton className="h-10 w-full rounded-none border-2 border-border/40" />
            </div>
            <div className="mt-auto space-y-2 border-t-4 border-border pt-4">
              <Skeleton className="h-3 w-32 rounded-none" />
              <Skeleton className="h-8 w-full rounded-none border-2 border-border/40" />
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-12 shrink-0 items-center gap-2 border-b-4 border-border bg-muted/15 px-4 sm:px-8">
              <Skeleton className="h-3 w-14 rounded-none" />
              <Skeleton className="h-3 w-3 rounded-none" />
              <Skeleton className="h-3 w-28 rounded-none" />
            </div>
            <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-10 sm:px-10 lg:py-14">
              <Skeleton className="h-10 w-full max-w-md rounded-none" />
              <Skeleton className="h-4 w-full max-w-2xl rounded-none" />
              <Skeleton className="h-4 w-full max-w-xl rounded-none" />
              <div className="space-y-3 pt-4">
                <Skeleton className="h-24 w-full rounded-none border-2 border-border/40" />
                <Skeleton className="h-24 w-full rounded-none border-2 border-border/40" />
                <Skeleton className="h-16 w-full rounded-none border-2 border-border/40" />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
