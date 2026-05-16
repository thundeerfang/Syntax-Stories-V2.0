'use client';

import { SkBar, SkBlock } from '@/components/skeletons/primitives';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';
import { cn } from '@/lib/utils';

/** Toolbar — matches `RailSectionSubheader` with left writer buttons + search on following page. */
export function FollowingToolbarSkeleton() {
  return (
    <div
      className="flex h-[58px] w-full animate-pulse items-center justify-between gap-3 border-2 border-border bg-white px-3 shadow-[4px_4px_0_0_var(--border)] dark:bg-card sm:h-[62px] sm:px-4"
      aria-hidden
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => `fc-${i}`).map((id) => (
          <SkBlock key={id} className="h-[42px] w-[6.5rem] shrink-0 rounded-none border-2 border-border bg-muted/20" />
        ))}
      </div>
      <SkBlock className="h-[42px] w-36 shrink-0 rounded-none border-2 border-border bg-muted/15 sm:w-44" />
    </div>
  );
}

/** Blog-card–shaped tiles (matches `BlogCard` weight). */
function FollowingBlogCardSkeletonTile() {
  return (
    <div className="flex min-h-0 w-full flex-col overflow-hidden border-[3px] border-border bg-card text-card-foreground shadow-[4px_4px_0_0_var(--border)]">
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-2 sm:p-2.5">
        <div className="-mx-2 -mt-2 w-[calc(100%+1rem)] shrink-0 overflow-hidden sm:-mx-2.5 sm:-mt-2.5 sm:w-[calc(100%+1.25rem)]">
          <SkBlock className="aspect-[16/10] w-full max-h-[150px] animate-pulse bg-muted/30 sm:max-h-[170px]" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex shrink-0 items-center justify-between gap-3 pb-2.5">
            <SkBlock className="h-5 w-24 animate-pulse border-2 border-border/60 bg-muted/25" />
            <SkBar className="h-2 w-8" />
          </div>
          <div className="space-y-2">
            <SkBar className="h-3 w-full" />
            <SkBar className="h-3 w-[88%]" />
          </div>
          <div className="flex items-center gap-2 pt-1.5 sm:pt-2">
            <SkBlock className="size-8 shrink-0 animate-pulse border border-border bg-muted/30 sm:size-9" />
            <div className="min-w-0 flex-1 space-y-1">
              <SkBar className="h-2 w-28" />
              <SkBar className="h-2 w-20" />
            </div>
            <div className="ml-auto flex shrink-0 gap-0.5">
              <SkBlock className="size-7 shrink-0 border-2 border-border bg-muted/20" />
              <SkBlock className="size-7 shrink-0 border-2 border-border bg-muted/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FollowingPostsGridSkeleton({ count = 6 }: Readonly<{ count?: number }>) {
  return (
    <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => `fp-${i}`).map((id) => (
        <li key={id} className="flex min-h-0">
          <FollowingBlogCardSkeletonTile />
        </li>
      ))}
    </ul>
  );
}

/** Intro row placeholders — aligns with `ShellPageIntroHeader` spacing. */
export function FollowingIntroSkeleton() {
  return (
    <header className="flex w-full flex-col items-start space-y-3 md:space-y-4" aria-hidden>
      <SkBlock className="h-10 w-full max-w-md animate-pulse border-2 border-border bg-card shadow-[3px_3px_0_0_var(--border)]" />
      <div className="w-full space-y-2">
        <SkBar className="h-8 w-full max-w-[18rem] sm:h-10" />
        <SkBar className="h-8 w-full max-w-[14rem] sm:h-10" />
      </div>
      <div className="w-full max-w-3xl space-y-2">
        <SkBar className="h-3 w-full" />
        <SkBar className="h-3 w-[92%]" />
      </div>
    </header>
  );
}

/** Full rail layout for following, bookmarks, reposts, and similar feed pages. */
export function FollowingPageContentSkeleton({
  showIntro = false,
}: Readonly<{ showIntro?: boolean }>) {
  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8" aria-busy="true">
        {showIntro ? <FollowingIntroSkeleton /> : null}
        <FollowingToolbarSkeleton />
        <section aria-label="Loading posts" className="min-w-0">
          <FollowingPostsGridSkeleton />
        </section>
      </div>
    </div>
  );
}
