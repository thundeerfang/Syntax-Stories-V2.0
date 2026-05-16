'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import { SHELL_NAV_INNER_CLASS } from '@/lib/shellContentRail';
import { cn } from '@/lib/utils';

/** Structural placeholder for `Navbar` before client mount (matches h-16 row + borders). */
export function NavbarSkeleton() {
  return (
    <header className="w-full border-b-2 border-border bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <div className={cn('flex h-16 items-center gap-4', SHELL_NAV_INNER_CLASS)}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-none border-2 border-border/60 bg-muted/50" />
          <Skeleton className="h-7 w-28 shrink-0 rounded-none sm:h-9 sm:w-36" />
        </div>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:flex" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-[4.5rem] shrink-0 rounded-none" />
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <Skeleton className="hidden h-9 max-w-[240px] flex-1 rounded-none border-2 border-border/50 md:block" />
          <Skeleton className="size-10 shrink-0 rounded-none border-2 border-border/50 md:hidden" />
          <Skeleton className="size-10 shrink-0 rounded-none border-2 border-border/50" />
          <Skeleton className="hidden h-9 w-24 shrink-0 rounded-none border-2 border-border/50 sm:block" />
        </div>
      </div>
    </header>
  );
}
