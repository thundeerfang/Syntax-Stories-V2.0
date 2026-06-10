'use client';

import { SkBar, SkBlock } from './primitives';
import { SQUAD_DISCOVER_CARD_GRID_CLASS } from '@/lib/squads/squadDiscoverCardLayout';
import { cn } from '@/lib/core/utils';

function SquadCardSkeletonTile() {
  return (
    <div
      className="flex h-full min-h-[13rem] flex-col border-2 border-border bg-card p-4 shadow"
      aria-hidden
    >
      <div className="flex items-start gap-2">
        <SkBlock className="size-14 shrink-0 animate-pulse border-2 border-border bg-muted/30" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <SkBar className="h-3.5 w-[70%]" />
          <SkBar className="h-2 w-[45%]" />
        </div>
      </div>
      <div className="mt-2 flex-1 space-y-1.5">
        <SkBar className="h-2 w-full" />
        <SkBar className="h-2 w-[92%]" />
        <SkBar className="h-2 w-[60%]" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <SkBlock className="h-5 w-14 animate-pulse border border-border bg-muted/20" />
        <SkBlock className="h-5 w-16 animate-pulse border border-border bg-muted/20" />
      </div>
    </div>
  );
}

export function SquadsPageBrowseSkeleton({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-4', className)} aria-hidden>
      <div className="min-w-0 flex-1 space-y-3">
        <ul className={SQUAD_DISCOVER_CARD_GRID_CLASS}>
          {Array.from({ length: 8 }, (_, i) => `sq-sk-${i}`).map((id) => (
            <li key={id} className="flex min-h-0">
              <SquadCardSkeletonTile />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Rail toolbar (left tabs + search/sort) + grid — matches squads page chrome. */
export function SquadsPageContentSkeleton() {
  return (
    <div className="w-full space-y-4" aria-hidden>
      <div className="flex h-[58px] w-full animate-pulse items-center justify-between gap-3 border-2 border-border bg-white px-3 shadow dark:bg-card sm:h-[62px] sm:px-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <SkBlock className="h-[42px] w-[7.25rem] border-2 border-border bg-muted/25" />
          <SkBlock className="h-[42px] w-[5.25rem] border-2 border-border bg-muted/15" />
          <SkBlock className="h-[42px] w-[5.75rem] border-2 border-border bg-muted/15" />
          <SkBlock className="h-[42px] w-[8.5rem] border-2 border-border bg-muted/15" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SkBlock className="h-[42px] w-36 border-2 border-border bg-muted/15 sm:w-44" />
          <SkBlock className="h-[42px] w-28 border-2 border-border bg-muted/15 sm:w-32" />
        </div>
      </div>
      <SquadsPageBrowseSkeleton />
    </div>
  );
}
