'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function NavbarSkeleton() {
  return (
    <header className="sticky top-0 z-30 w-full border-b-2 border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center px-4 sm:px-8">
        <div className="flex flex-1 items-center gap-4">
          <Skeleton className="h-9 w-9 shrink-0" />
          <Skeleton className="h-5 w-32" />
        </div>
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <Skeleton className="h-9 w-24 sm:w-32" />
          <Skeleton className="h-9 w-9 shrink-0" />
          <Skeleton className="h-9 w-12 shrink-0" />
          <Skeleton className="h-9 w-24 shrink-0" />
        </div>
      </div>
    </header>
  );
}
