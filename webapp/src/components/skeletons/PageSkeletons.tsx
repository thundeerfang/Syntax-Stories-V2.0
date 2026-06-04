'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton, SkillIconSkeleton } from '@/components/ui/feedback';
import { SkBar, SkBlock, SkGradientFill } from './primitives';
import { profileCardSkeletonKeys } from './constants';
import { cn } from '@/lib/core/utils';
import { BLOG_FEED_GRID_CLASS, BLOG_FEED_GRID_ITEM_CLASS } from '@/lib/blog/blogFeedGrid';
import {
  SHELL_CONTENT_MEASURE_CLASS,
  SHELL_CONTENT_RAIL_CLASS,
  SHELL_NAV_INNER_CLASS,
} from '@/lib/shell/shellContentRail';
import { SQUAD_DISCOVER_CARD_SLIDE_CLASS } from '@/lib/squads/squadDiscoverCardLayout';

/** Profile accordion entry placeholder (work, education, certs, etc.). */
export function ProfileCardSkeleton(props: Readonly<{ lines?: number }>) {
  const lines = props.lines ?? 3;
  const keys = profileCardSkeletonKeys(lines);
  return (
    <div className="border-2 border-border bg-muted/10 p-4 animate-pulse">
      <div className="h-4 w-40 bg-muted" />
      <div className="mt-3 space-y-2">
        {keys.map((key) => (
          <div key={key} className="h-3 w-full bg-muted" />
        ))}
        <div className="h-3 w-2/3 bg-muted" />
      </div>
    </div>
  );
}

const DASHBOARD_OUTER = 'relative mx-auto w-full min-w-0 max-w-[min(100%,87.5rem)] shrink-0';
const DASHBOARD_PAD = 'px-4 md:px-8';

/** Hero swiper placeholder — dots, edition badge, and bottom content blocks. */
export function HomeHeroSkeleton({ inline = false }: Readonly<{ inline?: boolean }>) {
  const inner = (
    <div className="relative h-[480px] w-full overflow-hidden bg-muted/20 md:h-[560px]">
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-1.5" aria-hidden>
        {['dot-a', 'dot-b', 'dot-c', 'dot-d'].map((id) => (
          <SkBlock key={id} className="size-3 shrink-0 border-2 border-border/50 bg-muted/35" />
        ))}
      </div>
      <SkBlock
        className="absolute right-4 top-4 z-10 h-[3.25rem] w-[4.25rem] rotate-12 border-2 border-border/55 bg-muted/40 animate-pulse"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 z-10 space-y-4 bg-gradient-to-t from-muted/50 via-muted/25 to-transparent p-6 pt-16 md:p-12 md:pt-20"
        aria-hidden
      >
        <SkBar className="h-6 w-28 bg-primary/15" />
        <SkBar className="h-10 w-full max-w-xl" />
        <SkBar className="h-10 w-full max-w-lg md:h-12" />
        <div className="space-y-2 pt-1">
          <SkBar className="h-2.5 w-14" />
          <SkBar className="h-4 w-full max-w-md" />
          <SkBar className="h-4 w-[88%] max-w-sm" />
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-border/30 pt-5">
          <div className="flex items-center gap-2">
            <SkBlock className="size-10 shrink-0 border-2 border-border/45 bg-muted/35" />
            <div className="space-y-1.5">
              <SkBar className="h-2.5 w-24" />
              <SkBar className="h-2.5 w-16" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['stat-a', 'stat-b', 'stat-c'].map((id) => (
              <SkBar key={id} className="h-3 w-10 shrink-0" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  if (inline) {
    return <div aria-hidden>{inner}</div>;
  }
  return (
    <div className="w-full min-w-0 overflow-hidden border-2 border-border bg-card" aria-hidden>
      {inner}
    </div>
  );
}

/** Library section title row (icon + label). */
export function HomeLibraryHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3" aria-hidden>
      <div className="flex items-center gap-2">
        <SkBlock className="size-5 shrink-0 border border-border/50 bg-primary/20" />
        <SkBar className="h-6 w-[4.75rem]" />
      </div>
    </div>
  );
}

/** Library filter pills — neutral bars, not faux interactive buttons. */
export function HomeLibraryPillsSkeleton() {
  return (
    <div className="-mx-1 flex gap-2 overflow-hidden px-1 pb-1" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => `hp-${i}`).map((id) => (
        <SkBar key={id} className="h-10 w-24 shrink-0" />
      ))}
    </div>
  );
}

/** Home dashboard (hero + library grid) — used by `/` and route loading. */
export function HomePageSkeletonInner() {
  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden" aria-busy="true">
      <div className={cn(DASHBOARD_OUTER, 'pt-8 md:pt-10')}>
        <div className={DASHBOARD_PAD}>
          <HomeHeroSkeleton />
        </div>
      </div>
      <div className={cn(DASHBOARD_OUTER, 'py-10 md:py-12')}>
        <section className={cn('min-w-0 max-w-full space-y-4 overflow-x-hidden', DASHBOARD_PAD)}>
          <HomeLibraryHeaderSkeleton />
          <HomeLibraryPillsSkeleton />
          <FollowingPostsGridSkeleton count={6} />
        </section>
      </div>
    </div>
  );
}

/** Lightweight placeholder rows — no accent colors or heavy chrome. */
function ProfileAccordionRowSk({
  showHeaderAction = true,
}: Readonly<{ showHeaderAction?: boolean }>) {
  return (
    <div className="overflow-hidden border border-border/50 bg-muted/5">
      <div className="flex w-full items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <SkBlock className="size-8 shrink-0 border border-border/40 bg-muted/25" />
          <div className="flex min-w-0 flex-col gap-1">
            <SkBar className="h-2 max-w-[11rem] w-32" />
            <SkBar className="h-1.5 w-20" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {showHeaderAction ? (
            <SkBlock className="h-6 w-12 shrink-0 border border-border/40 bg-muted/20" />
          ) : null}
          <SkBlock className="size-3.5 shrink-0 border-0 bg-muted/35" />
        </div>
      </div>
      <div className="space-y-1.5 px-3 py-2.5">
        <SkBar className="h-1.5 w-full" />
        <SkBar className="h-1.5 w-[92%]" />
        <SkBar className="h-1.5 w-[48%]" />
      </div>
    </div>
  );
}

export type ProfilePageSkeletonVariant = 'owner' | 'public';

function ProfileRightColumnSkeleton({
  variant,
}: Readonly<{ variant: ProfilePageSkeletonVariant }>) {
  const isOwner = variant === 'owner';

  if (!isOwner) {
    return (
      <>
        <div className="border-4 border-border bg-card p-4 shadow">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <SkBlock className="size-9 shrink-0 animate-pulse border-2 border-border bg-muted/50" />
              <div className="min-w-0 flex-1 space-y-1">
                <SkBar className="h-2 w-40" />
                <SkBar className="h-2 w-full max-w-[14rem]" />
              </div>
            </div>
            <SkBlock className="size-9 shrink-0 animate-pulse border-2 border-border" />
          </div>
        </div>

        <div className="border-4 border-border bg-card p-5 shadow">
          <div className="mb-3 flex items-center gap-2">
            <SkBlock className="size-4 animate-pulse border border-border" />
            <SkBar className="h-2 w-28" />
          </div>
          <div className="flex items-center justify-between">
            <SkBar className="h-8 w-14" />
            <SkBar className="h-2 w-24" />
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden border-2 border-border bg-muted animate-pulse">
            <div className="h-full w-[4%] bg-primary/70" />
          </div>
        </div>

        <div className="space-y-4 border-4 border-border bg-card p-5 shadow">
          <div className="flex items-center justify-between">
            <SkBar className="h-2 w-36" />
            <SkBar className="h-2 w-24" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b-2 border-dashed border-border py-2">
              <SkBar className="h-2 w-32" />
              <SkBar className="h-3 w-8" />
            </div>
            <div className="flex items-center justify-between py-2">
              <SkBar className="h-2 w-28" />
              <SkBar className="h-3 w-8" />
            </div>
          </div>
        </div>

        <div className="border-4 border-border bg-card p-4 shadow">
          <div className="mb-3 flex items-center gap-2">
            <SkBlock className="size-8 animate-pulse border-2 border-border bg-muted/30" />
            <div className="space-y-1">
              <SkBar className="h-2 w-28" />
              <SkBar className="h-2 w-40" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {['l1', 'l2', 'l3', 'l4'].map((k) => (
              <SkBlock
                key={k}
                className="size-11 animate-pulse border-2 border-border bg-card shadow"
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-4 border-border bg-card p-4 shadow">
        <div className="flex items-center gap-3">
          <SkBlock className="size-9 animate-pulse border-2 border-border shadow" />
          <div className="space-y-1">
            <SkBar className="h-2 w-28" />
            <SkBar className="h-2 w-24" />
          </div>
        </div>
        <SkBlock className="h-7 w-12 animate-pulse border-2 border-border" />
      </div>

      <div className="border-4 border-border bg-card p-4 shadow">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <SkBlock className="size-9 shrink-0 animate-pulse border-2 border-border bg-muted/50" />
            <div className="min-w-0 flex-1 space-y-1">
              <SkBar className="h-2 w-40" />
              <SkBar className="h-2 w-full max-w-[14rem]" />
            </div>
          </div>
          <SkBlock className="size-9 shrink-0 animate-pulse border-2 border-border" />
        </div>
      </div>

      <div className="space-y-4 border-4 border-border bg-card p-5 shadow">
        <SkBar className="h-2 w-32" />
        <SkBar className="h-2 w-full max-w-xs" />
        <SkBlock className="flex min-h-[3rem] w-full animate-pulse items-center justify-between border-2 border-border bg-muted/30 p-3" />
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          {['x1', 'x2', 'x3', 'x4'].map((k) => (
            <SkBlock key={k} className="size-10 animate-pulse border-2 border-border bg-muted/30" />
          ))}
        </div>
      </div>

      <div className="border-4 border-border bg-card p-5 shadow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SkBar className="h-2 w-36" />
            <SkBlock className="size-4 animate-pulse border-2 border-border" />
          </div>
          <SkBlock className="h-8 w-36 animate-pulse border-2 border-border shadow" />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {['m1', 'm2', 'm3'].map((k) => (
            <SkBlock
              key={k}
              className="h-7 w-28 animate-pulse border-2 border-border bg-muted/40"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex min-h-0 flex-row items-stretch border-2 border-border bg-muted/5 p-3 shadow"
            >
              <div className="flex shrink-0 flex-col justify-center gap-1 pr-4 text-left">
                <SkBar className="h-6 w-12" />
                <SkBar className="h-2 w-24" />
                <SkBar className="h-2 w-20" />
              </div>
              <SkBlock className="h-14 min-w-0 flex-1 animate-pulse border-2 border-dashed border-border bg-muted/10" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6 border-4 border-border bg-card p-5 shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SkBlock className="size-4 animate-pulse border border-border" />
            <SkBar className="h-2 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 border-2 border-border bg-muted/10 p-2 animate-pulse">
            <SkBar className="h-6 w-10" />
            <SkBar className="h-2 w-24" />
          </div>
          <div className="space-y-2 border-2 border-border bg-muted/10 p-2 animate-pulse">
            <SkBar className="h-6 w-8" />
            <SkBar className="h-2 w-28" />
          </div>
        </div>
        <div className="space-y-3">
          <SkBar className="h-2 w-20" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <SkBar className="h-2 w-12" />
              <SkBar className="h-2 w-8" />
            </div>
            <div className="h-2.5 w-full overflow-hidden border-2 border-border bg-muted animate-pulse">
              <div className="h-full w-[70%] bg-primary/60" />
            </div>
            <div className="flex justify-between">
              <SkBar className="h-2 w-14" />
              <SkBar className="h-2 w-8" />
            </div>
            <div className="h-2.5 w-full overflow-hidden border-2 border-border bg-muted animate-pulse">
              <div className="h-full w-[45%] bg-primary/60" />
            </div>
          </div>
        </div>
        <div className="space-y-3 pt-2">
          <SkBar className="h-2 w-32" />
          <div className="grid grid-cols-3 gap-2">
            {['p', 'q', 'r'].map((k) => (
              <SkBlock
                key={k}
                className="border-2 border-border bg-card p-2 text-center shadow animate-pulse"
              >
                <SkBar className="mx-auto h-4 w-6" />
                <SkBar className="mx-auto mt-2 h-2 w-12" />
              </SkBlock>
            ))}
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <SkBar className="h-2 w-44" />
          <SkBlock className="h-24 w-full animate-pulse overflow-hidden border-2 border-border bg-muted/5 p-2">
            <div className="flex gap-1">
              {Array.from({ length: 14 }, (_, j) => `h-${j}`).map((id) => (
                <SkBlock
                  key={id}
                  className="size-3 shrink-0 animate-pulse border border-border/60"
                />
              ))}
            </div>
          </SkBlock>
        </div>
      </div>

      <div className="border-4 border-border bg-card p-5 shadow">
        <div className="mb-3 flex items-center gap-2">
          <SkBlock className="size-4 animate-pulse border border-border" />
          <SkBar className="h-2 w-28" />
        </div>
        <div className="flex items-center justify-between">
          <SkBar className="h-8 w-16" />
          <SkBar className="h-2 w-16" />
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden border-2 border-border bg-muted animate-pulse">
          <div className="h-full w-[12%] bg-primary/70" />
        </div>
      </div>

      <div className="space-y-4 border-4 border-border bg-card p-5 shadow">
        <div className="flex items-center justify-between">
          <SkBar className="h-2 w-36" />
          <SkBar className="h-2 w-24" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b-2 border-dashed border-border py-2">
            <SkBar className="h-2 w-32" />
            <SkBar className="h-3 w-8" />
          </div>
          <div className="flex items-center justify-between py-2">
            <SkBar className="h-2 w-28" />
            <SkBar className="h-3 w-8" />
          </div>
        </div>
      </div>
    </>
  );
}

/** `/profile` (owner) and `/u/[username]` (public) — mirrors real page layout and section order. */
export function ProfilePageSkeletonInner({
  variant = 'owner',
}: Readonly<{ variant?: ProfilePageSkeletonVariant }>) {
  const isOwner = variant === 'owner';

  return (
    <div
      className={cn(
        'min-h-screen w-full py-6 font-sans text-foreground md:py-8',
        isOwner && 'ss-profile-readonly'
      )}
    >
      <div className={SHELL_CONTENT_RAIL_CLASS}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT — matches lg:col-span-8 space-y-8 */}
          <div className="space-y-8 lg:col-span-8">
            {/* HEADER */}
            <section className="overflow-hidden border-4 border-border bg-card shadow">
              {/* Cover: pulse only the fill — keep border fully opaque so it does not show through the avatar */}
              <div className="relative h-48 w-full shrink-0 border-b-4 border-border bg-muted/25">
                <div className="absolute inset-0 animate-pulse bg-muted/35" aria-hidden />
              </div>
              <div className="relative bg-card px-6 pb-8 pt-24 md:pt-32">
                {/*
                Avatar: solid bg + z-index so the cover bottom border never reads "inside" the box.
                Do not put animate-pulse on this node — pulse opacity would reveal the line behind.
              */}
                <div
                  className="absolute -top-14 left-6 z-20 size-28 border-4 border-border bg-card shadow md:size-36"
                  aria-hidden
                >
                  <div className="absolute inset-0 animate-pulse bg-muted/40" />
                </div>
                <div className="flex flex-col gap-4">
                  <div
                    className={cn(
                      'flex flex-col justify-between gap-4 md:items-start',
                      isOwner ? 'md:flex-row' : 'md:flex-row md:items-end'
                    )}
                  >
                    <div className="space-y-2">
                      <SkBar className="h-10 max-w-xs w-[72%]" />
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <SkBar className="h-3 w-28" />
                        <SkBlock className="size-7 animate-pulse border-2 border-border" />
                        {isOwner ? <SkBar className="h-2 w-32" /> : null}
                      </div>
                    </div>
                    {isOwner ? (
                      <SkBlock className="h-10 w-[11rem] shrink-0 animate-pulse border-2 border-border md:mt-1" />
                    ) : (
                      <div className="flex shrink-0 gap-2 md:pb-0.5">
                        <SkBlock className="h-10 w-24 animate-pulse border-2 border-border shadow" />
                        <SkBlock className="h-10 w-28 animate-pulse border-2 border-border bg-muted/30" />
                      </div>
                    )}
                  </div>
                  {/* Bio — opaque panel + bg strip behind chip (matches real page) so the top border is not visible through the chip */}
                  <div className="relative z-0 mt-2 border-2 border-primary bg-card p-6 pt-8">
                    <div className="absolute -top-3 left-6 z-[2] inline-flex items-end bg-card px-2 pb-px">
                      <div className="relative h-6 w-36 border-2 border-primary bg-primary/15">
                        <div className="absolute inset-0 animate-pulse bg-primary/10" aria-hidden />
                      </div>
                    </div>
                    <div
                      className="absolute right-4 top-2 z-[1] hidden h-2 w-28 bg-card sm:block"
                      aria-hidden
                    />
                    <div className="space-y-2 pt-1">
                      <SkBar className="h-2 w-full" />
                      <SkBar className="h-2 w-full" />
                      <SkBar className="h-2 w-[88%]" />
                      <SkBar className="h-2 w-[70%]" />
                    </div>
                    <div
                      className="absolute bottom-1 right-1 size-3 border-r-2 border-b-2 border-border/50"
                      aria-hidden
                    />
                  </div>
                  {/* Stats — owner: dashed gray strip; public: dashed border strip + dividers */}
                  <div
                    className={cn(
                      'mt-8 flex flex-wrap border-4 border-dashed bg-muted/5 p-4',
                      isOwner ? 'gap-6 border-gray-300 dark:border-border' : 'gap-3 border-border'
                    )}
                  >
                    {['a', 'b', 'c', 'd', 'e'].map((id, i) => (
                      <div
                        key={id}
                        className={cn(
                          'flex items-center gap-2',
                          !isOwner && i < 4 && 'border-r-2 border-border/50 pr-4'
                        )}
                      >
                        <SkBlock className="size-6 shrink-0 animate-pulse border-2 border-border" />
                        <div className="space-y-1">
                          <SkBar className="h-3 w-6" />
                          <SkBar className="h-2 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {isOwner ? (
              <section className="space-y-4 border-4 border-border bg-card p-4 shadow">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <SkBlock className="size-4 shrink-0 animate-pulse border border-border" />
                    <SkBar className="h-3 w-24" />
                  </div>
                  <SkBlock className="h-9 w-28 animate-pulse border-2 border-border" />
                </div>
                <div className="flex flex-wrap gap-1 border-b-2 border-border pb-2">
                  {['Published', 'Drafts', 'Deleted'].map((label) => (
                    <SkBlock
                      key={label}
                      className="h-9 min-w-[5.5rem] animate-pulse border-2 border-border px-3"
                    />
                  ))}
                </div>
                <div className="space-y-3 border-2 border-dashed border-border bg-muted/5 p-4 sm:p-5">
                  <SkBar className="h-2 w-48" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SkBlock className="h-28 animate-pulse border-2 border-border bg-card shadow" />
                    <SkBlock className="h-28 animate-pulse border-2 border-border bg-card shadow" />
                  </div>
                </div>
              </section>
            ) : (
              <section className="space-y-4 border-4 border-border bg-card p-4 shadow">
                <SkBar className="h-3 w-36" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {['pb1', 'pb2', 'pb3', 'pb4'].map((k) => (
                    <div key={k} className="overflow-hidden border-2 border-border bg-card shadow">
                      <SkBlock className="aspect-[16/10] w-full animate-pulse border-b-2 border-border" />
                      <div className="space-y-2 p-3">
                        <SkBar className="h-2 max-w-[200px] w-[78%]" />
                        <SkBar className="h-2 max-w-[120px] w-[45%]" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Activity */}
            <section className="space-y-4 border-4 border-border bg-card p-4 shadow">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SkBlock className="size-4 shrink-0 animate-pulse border border-border" />
                  <SkBar className="h-3 w-28" />
                </div>
                {isOwner ? (
                  <SkBlock className="h-9 w-28 animate-pulse border-2 border-border" />
                ) : null}
              </div>
              <div className="flex gap-1 border-b-4 border-border pb-3">
                {(isOwner
                  ? (['Posts', 'Replies', 'Repost'] as const)
                  : (['Posts', 'Repost'] as const)
                ).map((t) => (
                  <SkBlock key={t} className="h-10 flex-1 animate-pulse border-2 border-border" />
                ))}
              </div>
              <div className="border-4 border-dashed border-border bg-muted/5 p-4 sm:p-6">
                <div className="mx-auto max-w-md space-y-3 py-6">
                  <SkBar className="mx-auto h-2 w-48" />
                  <SkBar className="mx-auto h-2 w-36" />
                </div>
              </div>
            </section>

            {isOwner ? (
              <div className="flex flex-col items-center gap-6 border-4 border-border bg-primary p-6 shadow md:flex-row">
                <div className="size-16 shrink-0 -rotate-3 animate-pulse border-4 border-primary-foreground/40 bg-primary-foreground/15" />
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <div className="mx-auto h-4 max-w-full w-56 border-2 border-primary-foreground/40 bg-primary-foreground/20 animate-pulse md:mx-0" />
                  <div className="mx-auto h-2 max-w-md w-full border border-primary-foreground/30 bg-primary-foreground/15 animate-pulse md:mx-0" />
                </div>
                <div className="h-12 w-40 shrink-0 animate-pulse border-4 border-primary-foreground/50 bg-primary-foreground/25" />
              </div>
            ) : null}

            {/* Stack & Tools | My Setup */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <section className="space-y-4 border-4 border-border bg-card p-4 shadow">
                <div className="flex items-center justify-between gap-2 border-b-2 border-border px-2 pb-3 md:px-0">
                  <div className="flex items-center gap-2">
                    <SkBlock className="size-8 animate-pulse border-2 border-border" />
                    <SkBar className="h-3 w-32" />
                  </div>
                  {isOwner ? (
                    <SkBlock className="size-8 animate-pulse border-2 border-border" />
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 py-1">
                  {['s1', 's2', 's3', 's4', 's5'].map((k) => (
                    <SkBlock
                      key={k}
                      className="h-11 w-[7.5rem] animate-pulse border-2 border-border bg-muted/10 shadow"
                    />
                  ))}
                </div>
              </section>
              <section className="space-y-4 border-4 border-border bg-card p-4 shadow">
                <div className="flex items-center justify-between gap-2 border-b-2 border-border px-2 pb-3 md:px-0">
                  <div className="flex items-center gap-2">
                    <SkBlock className="size-8 animate-pulse border-2 border-border" />
                    <SkBar className="h-3 w-28" />
                  </div>
                  {isOwner ? (
                    <SkBlock className="size-8 animate-pulse border-2 border-border" />
                  ) : null}
                </div>
                <div className="flex gap-3 overflow-hidden py-1">
                  {['u1', 'u2'].map((k) => (
                    <div
                      key={k}
                      className="w-[240px] shrink-0 overflow-hidden border-2 border-border bg-muted/10 shadow"
                    >
                      <SkBlock className="h-28 w-full animate-pulse border-b-2 border-border" />
                      <div className="space-y-2 p-3">
                        <SkBar className="h-2 w-24" />
                        <SkBar className="h-2 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Section list — same count as live accordions, minimal chrome */}
            <div className="space-y-2.5">
              {Array.from({ length: 5 }, (_, i) => (
                <ProfileAccordionRowSk key={`profile-acc-sk-${i}`} showHeaderAction={isOwner} />
              ))}
            </div>
          </div>

          {/* RIGHT — lg:col-span-4 space-y-6 */}
          <div className="space-y-6 lg:col-span-4">
            <ProfileRightColumnSkeleton variant={variant} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** `/profile/analytics` */
export function AnalyticsPageSkeletonInner() {
  return (
    <div className="min-h-screen w-full bg-background py-6 font-sans md:py-8">
      <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'space-y-6')}>
        <div className="flex flex-col justify-between gap-4 border-b-4 border-border pb-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <SkBlock className="size-12 shrink-0 animate-pulse border-4 border-border" />
            <div className="space-y-2">
              <SkBar className="h-8 w-48" />
              <SkBar className="h-2 w-36" />
            </div>
          </div>
          <div className="flex gap-1 border-2 border-border bg-muted/10 p-1 self-start">
            {['t1', 't2', 't3'].map((id) => (
              <SkBlock key={id} className="h-10 w-28 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => `m-${i}`).map((id) => (
            <SkBlock key={id} className="h-28 border-2 border-border animate-pulse" />
          ))}
        </div>
        <SkBlock className="h-72 w-full border-2 border-border animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          <SkBlock className="h-48 border-2 border-border animate-pulse" />
          <SkBlock className="h-48 border-2 border-border animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** `/blogs/write` — mirrors top bar + left tools + centre draft + right publish (light placeholders). */
export function BlogWritePageSkeletonInner() {
  return (
    <div
      className={cn(
        'flex h-screen max-h-screen min-h-0 flex-col overflow-hidden border-2 border-border bg-background font-mono text-foreground shadow',
        SHELL_CONTENT_RAIL_CLASS
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-border bg-card py-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <SkBlock className="size-7 shrink-0 border border-border/50 bg-muted/20" />
          <SkBar className="h-2.5 max-w-[200px] w-[40%] sm:w-48" />
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <SkBar className="h-2 w-16 max-sm:hidden" />
          <SkBar className="hidden h-2 w-14 md:block" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left — block tools (lg only, same as live shell) */}
        <aside className="hidden w-[280px] shrink-0 flex-col border-r border-border/50 bg-muted/5 px-3 py-3 lg:flex">
          <p className="mb-2 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
            Tools
          </p>
          <div className="space-y-1.5">
            {Array.from({ length: 6 }, (_, i) => `tw-${i}`).map((id) => (
              <div key={id} className="flex items-center gap-2 border border-transparent px-2 py-1">
                <SkBlock className="size-3.5 shrink-0 border-0 bg-muted/40" />
                <SkBar className="h-1.5 flex-1 max-w-[9rem]" />
              </div>
            ))}
          </div>
          <p className="mb-2 mt-5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
            Stats
          </p>
          <SkBlock className="h-16 w-full border border-border/40 bg-muted/10" />
        </aside>

        {/* Centre — title + summary + body */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/50 lg:border-x">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <p className="mb-1 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
              Title
            </p>
            <SkBar className="mb-6 h-4 w-full max-w-xl" />
            <p className="mb-1 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
              Summary
            </p>
            <div className="mb-8 space-y-1.5">
              <SkBar className="h-1.5 w-full" />
              <SkBar className="h-1.5 w-[92%]" />
              <SkBar className="h-1.5 w-[70%]" />
            </div>
            <p className="mb-2 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
              Body
            </p>
            <div className="space-y-3 border border-border/40 bg-muted/5 p-3">
              {Array.from({ length: 5 }, (_, i) => `bd-${i}`).map((id) => (
                <SkBar key={id} className="h-1.5 w-full" />
              ))}
              <SkBar className="h-1.5 w-[55%]" />
            </div>
          </div>
        </main>

        {/* Right — publish + assets */}
        <aside className="hidden w-[300px] shrink-0 flex-col border-l border-border/50 bg-card/40 px-4 py-3 lg:flex">
          <p className="mb-2 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
            Publish
          </p>
          <div className="space-y-2">
            <SkBlock className="h-9 w-full border border-border/50 bg-muted/15" />
            <SkBlock className="h-9 w-full border border-border/40 bg-muted/10" />
          </div>
          <p className="mb-2 mt-5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
            Thumbnail
          </p>
          <SkBlock className="aspect-video w-full max-w-full border border-border/40 bg-muted/10" />
        </aside>
      </div>
    </div>
  );
}

/** Matches `PublicBlogPostPage` loading UI — use in route `loading.tsx` + client fetch state. */
export function BlogPostPageSkeletonInner() {
  return (
    <div className="public-blog-post-page flex min-h-screen flex-col bg-background text-foreground">
      <div
        className={cn(
          SHELL_CONTENT_RAIL_CLASS,
          'relative flex-1 !overflow-visible py-6 md:py-10 xl:py-6'
        )}
      >
        <div className="w-full border-2 border-border bg-transparent">
          <div className="px-3 py-6 sm:px-4 lg:px-5 md:py-10">
            <div className="mb-8 flex flex-wrap gap-3">
              <div className="h-8 w-40 animate-pulse bg-muted sm:h-9" aria-hidden />
              <div className="h-8 w-32 animate-pulse bg-muted/70 sm:h-9" aria-hidden />
            </div>
            <div className="mb-10 space-y-3 md:space-y-4">
              <div className="h-10 w-full max-w-4xl animate-pulse bg-muted md:h-14" aria-hidden />
              <div className="h-10 w-[92%] max-w-3xl animate-pulse bg-muted md:h-14" aria-hidden />
              <div className="h-10 w-[64%] max-w-2xl animate-pulse bg-muted md:h-14" aria-hidden />
            </div>
            <div className="border-l-4 border-primary/25 bg-muted/10 p-6 md:p-8">
              <div className="mb-4 h-3 w-36 animate-pulse bg-muted/80" aria-hidden />
              <div className="space-y-2">
                <div className="h-2.5 w-full animate-pulse bg-muted" aria-hidden />
                <div className="h-2.5 w-full animate-pulse bg-muted" aria-hidden />
                <div className="h-2.5 w-[78%] animate-pulse bg-muted" aria-hidden />
              </div>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
              Initializing_Stream…
            </div>
          </div>
          <div className="px-3 py-6 sm:px-4 lg:px-5 md:py-10">
            <div className={cn('space-y-3', SHELL_CONTENT_MEASURE_CLASS)}>
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={`blog-post-sk-${i}`}
                  className="h-2.5 animate-pulse bg-muted"
                  style={{
                    width: i % 4 === 0 ? '100%' : i % 4 === 1 ? '96%' : i % 4 === 2 ? '88%' : '72%',
                  }}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type DialogPanelSkeletonProps = {
  /** Shown above structural placeholders (e.g. OAuth status). */
  statusLine?: ReactNode;
  className?: string;
};

/** Matches `FormDialog` / `Dialog` proportions: header tile + title, form rows, footer actions. */
export function DialogPanelSkeleton({ statusLine, className }: Readonly<DialogPanelSkeletonProps>) {
  return (
    <div
      className={cn(
        'flex w-full max-w-lg flex-col overflow-hidden  border-2 border-border bg-card shadow',
        className
      )}
    >
      <header className="flex items-end gap-3 border-b-2 border-border bg-muted/20 px-4 py-3 sm:gap-4">
        <SkBlock className="size-11 shrink-0 animate-pulse border-2 border-border" />
        <div className="min-w-0 flex-1 space-y-2 pb-0.5">
          <SkBar className="h-4 max-w-[220px] w-[60%]" />
          <SkBar className="h-2 max-w-[280px] w-[75%]" />
        </div>
        <SkBlock className="size-8 shrink-0 animate-pulse" />
      </header>
      {statusLine != null && (
        <div className="border-b border-border/60 bg-background/80 px-4 py-2 text-center text-xs font-medium text-muted-foreground">
          {statusLine}
        </div>
      )}
      <div className="min-h-[max(12rem,28vh)] space-y-4 p-4 sm:p-5">
        <div className="space-y-2">
          <SkBar className="h-2 w-24" />
          <SkBlock className="h-10 w-full animate-pulse" />
        </div>
        <div className="space-y-2">
          <SkBar className="h-2 w-28" />
          <SkBlock className="h-10 w-full animate-pulse" />
        </div>
        <div className="space-y-2">
          <SkBar className="h-2 w-20" />
          <SkBlock className="h-24 w-full animate-pulse" />
        </div>
      </div>
      <footer className="flex justify-end gap-2 border-t-2 border-border bg-muted/10 px-4 py-3">
        <SkBlock className="h-9 w-20 animate-pulse" />
        <SkBlock className="h-9 w-24 animate-pulse" />
      </footer>
    </div>
  );
}

const DOCS_PAGE_MIN = 'min-h-[calc(100vh-var(--header-height))]';

/** Matches `docs/layout` chrome: frame, sidebar rail, breadcrumb strip, prose blocks. */
export function DocsPageSkeletonInner() {
  return (
    <div className={`flex w-full flex-col ${DOCS_PAGE_MIN}`}>
      <div
        className={`mx-auto flex w-full max-w-[1440px] flex-1 flex-col border-4 border-border bg-card shadow ${DOCS_PAGE_MIN}`}
      >
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="hidden w-72 shrink-0 flex-col gap-4 border-border bg-card/50 p-4 lg:flex lg:border-r-4">
            <div className="space-y-2 border-b-4 border-border pb-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-9 w-full border-2 border-border/40" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full border-2 border-border/40" />
              <Skeleton className="h-10 w-full border-2 border-border/40" />
              <Skeleton className="h-10 w-full border-2 border-border/40" />
            </div>
            <div className="mt-auto space-y-2 border-t-4 border-border pt-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-8 w-full border-2 border-border/40" />
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-12 shrink-0 items-center gap-2 border-b-4 border-border bg-muted/15 px-4 sm:px-8">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-10 sm:px-10 lg:py-14">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-4 w-full max-w-xl" />
              <div className="space-y-3 pt-4">
                <Skeleton className="h-24 w-full border-2 border-border/40" />
                <Skeleton className="h-24 w-full border-2 border-border/40" />
                <Skeleton className="h-16 w-full border-2 border-border/40" />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/** Matches contact page: rail, two-column grid, form card + sidebar card. */
export function ContactPageSkeletonInner() {
  return (
    <div className={`${SHELL_CONTENT_RAIL_CLASS} py-8 pb-24 md:py-12`}>
      <div className="w-full space-y-8">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] xl:gap-12">
          <div className="space-y-8">
            <div className="space-y-3">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-12 w-full max-w-lg" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>

            <section className="border-4 border-border bg-card shadow">
              <div className="flex items-center justify-between border-b-4 border-border bg-muted/30 px-6 py-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="size-5" />
              </div>
              <div className="space-y-6 p-6 sm:p-10">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Skeleton className="h-14 w-full border-2 border-border/40" />
                  <Skeleton className="h-14 w-full border-2 border-border/40" />
                </div>
                <Skeleton className="h-14 w-full border-2 border-border/40" />
                <Skeleton className="h-14 w-full border-2 border-border/40" />
                <Skeleton className="h-36 w-full border-2 border-border/40" />
                <Skeleton className="h-12 w-full border-2 border-border/40" />
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="border-4 border-border bg-card shadow">
              <div className="border-b-4 border-border bg-muted/30 px-6 py-4">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="space-y-4 p-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full max-w-sm" />
                <Skeleton className="h-20 w-full border-2 border-border/30" />
              </div>
            </div>
            <div className="border-4 border-border bg-card p-6 shadow">
              <Skeleton className="h-3 w-24" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function SettingsSidebarSkeleton({ itemCount }: { itemCount: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-4 border-border bg-card p-4 shadow">
        <SkBlock className="size-10 shrink-0 animate-pulse" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkBar className="h-2.5 w-[70%]" />
          <SkBar className="h-2 w-[50%]" />
        </div>
      </div>
      <div className="space-y-2 border-4 border-border bg-card p-3 shadow">
        {Array.from({ length: itemCount }, (_, idx) => `nav-skeleton-${idx + 1}`).map(
          (itemId, i) => (
            <div key={itemId} className="flex items-center gap-3 px-1 py-1.5">
              <SkBlock className="size-4 shrink-0 animate-pulse" />
              <SkBar style={{ width: `${45 + ((i * 11) % 41)}%` }} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

/** Settings → Stack & Tools section (section switch + route loading). */
export function StackToolsSettingsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-5', className)} aria-hidden>
      <div className="space-y-2">
        <SkBar className="h-6 w-44" />
        <SkBar className="h-3 w-full max-w-lg" />
      </div>
      <div className="space-y-5">
        <div className="space-y-2">
          <SkBar className="h-2 w-28" />
          <div className="flex flex-wrap gap-2">
            {['a', 'b', 'c'].map((k) => (
              <div key={k} className="flex h-8 items-center gap-2 bg-card px-2">
                <SkillIconSkeleton className="size-5 shrink-0" />
                <SkBar className="h-2 w-12" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <SkBar className="h-2 w-24" />
          <SkBlock className="h-10 w-full animate-pulse border-2 border-border bg-background" />
          <SkBar className="h-2 w-56" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-border/30 pt-3">
          <SkBlock className="h-8 w-28 animate-pulse border-2 border-border bg-muted/30" />
          <SkBlock className="h-10 w-32 animate-pulse border-2 border-border bg-primary/20" />
        </div>
      </div>
    </div>
  );
}

export function SettingsContentSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-8', className)}>
      <div className="space-y-3">
        <SkBar className="h-6 w-[40%]" />
        <SkBar className="h-3 w-[65%]" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <SkBar className="h-2 w-[30%]" />
          <SkBlock className="h-32 animate-pulse" />
        </div>
        <div className="space-y-3">
          <SkBar className="h-2 w-[25%]" />
          <div className="flex items-center gap-4">
            <SkBlock className="size-20 animate-pulse" />
            <SkBar className="h-8 w-20" />
          </div>
        </div>
      </div>
      <div className="space-y-4 border-t-2 border-border/20 pt-6">
        <SkBar className="h-2 w-[25%]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <SkBar className="h-2 w-[20%]" />
            <SkBlock className="h-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <SkBar className="h-2 w-[20%]" />
            <SkBlock className="h-10 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <SkBar className="h-2 w-[15%]" />
          <SkBlock className="h-24 animate-pulse" />
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t-2 border-border/20 pt-6">
        <SkBar className="h-10 w-20" />
        <SkBar className="h-10 w-[120px]" />
      </div>
    </div>
  );
}

/** Settings grid — for route `loading` and auth gate (inside main content). */
export function SettingsPageSkeletonInner({ navItems = 18 }: { navItems?: number }) {
  return (
    <div className="min-h-screen font-sans text-foreground">
      <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'py-8 md:py-12')}>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[256px_1fr]">
          <aside className="mx-auto w-full max-w-[256px] overflow-hidden lg:mx-0">
            <SettingsSidebarSkeleton itemCount={navItems} />
          </aside>
          <main className="min-w-0">
            <div className="min-h-[600px] border-4 border-border bg-card p-6 shadow md:p-10">
              <SettingsContentSkeleton className="animate-pulse" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/** Toolbar — matches `RailSectionSubheader` with left writer buttons + search on following page. */
export function FollowingToolbarSkeleton() {
  return (
    <div
      className="flex h-[58px] w-full animate-pulse items-center justify-between gap-3 border-2 border-border bg-white px-3 shadow dark:bg-card sm:h-[62px] sm:px-4"
      aria-hidden
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => `fc-${i}`).map((id) => (
          <SkBlock
            key={id}
            className="h-[42px] w-[6.5rem] shrink-0 border-2 border-border bg-muted/20"
          />
        ))}
      </div>
      <SkBlock className="h-[42px] w-36 shrink-0 border-2 border-border bg-muted/15 sm:w-44" />
    </div>
  );
}

/** Blog-card–shaped tiles (matches `BlogCard` weight). */
function FollowingBlogCardSkeletonTile() {
  return (
    <div className="flex min-h-0 w-full flex-col overflow-hidden border-[3px] border-border bg-card text-card-foreground">
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-2 sm:p-2.5">
        <div className="-mx-2 -mt-2 w-[calc(100%+1rem)] shrink-0 overflow-hidden sm:-mx-2.5 sm:-mt-2.5 sm:w-[calc(100%+1.25rem)]">
          <SkBlock className="h-[160px] w-full animate-pulse border-0 bg-muted/40 sm:h-[178px]" />
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
            <div className="ml-auto flex shrink-0 gap-1.5" aria-hidden>
              {['eng-a', 'eng-b', 'eng-c', 'eng-d'].map((id) => (
                <SkBar key={id} className="size-9 shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FollowingPostsGridSkeleton({
  count = 6,
  className,
}: Readonly<{ count?: number; className?: string }>) {
  return (
    <ul className={cn(BLOG_FEED_GRID_CLASS, className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => `fp-${i}`).map((id) => (
        <li key={id} className={BLOG_FEED_GRID_ITEM_CLASS}>
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
      <SkBlock className="h-10 w-full max-w-md animate-pulse border-2 border-border bg-card shadow" />
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

/** Horizontal blog-card swiper — explore buffer rail & trending lanes. */
export function CompactBlogPostsSwiperSkeleton({
  slideCount = 3,
  showToolbar = true,
  className,
}: Readonly<{
  slideCount?: number;
  showToolbar?: boolean;
  className?: string;
}>) {
  return (
    <div
      className={cn('relative flex w-full min-w-0 flex-col', className)}
      aria-busy="true"
      aria-hidden
    >
      {showToolbar ? (
        <div className="mb-3 flex w-full min-w-0 shrink-0 items-center gap-3">
          <SkBlock className="size-2.5 shrink-0 bg-primary/40" />
          <SkBar className="h-4 w-56 max-w-[70%]" />
          <div className="ml-auto flex shrink-0 gap-1">
            <SkBlock className="size-10 border-2 border-border/60 bg-card" />
            <SkBlock className="size-10 border-2 border-border/60 bg-card" />
          </div>
        </div>
      ) : null}
      <div className="flex flex-nowrap gap-3 overflow-hidden pb-2">
        {Array.from({ length: slideCount }, (_, i) => `sw-${i}`).map((id) => (
          <div key={id} className="w-[22rem] shrink-0 sm:w-[23rem] md:w-[24rem]">
            <FollowingBlogCardSkeletonTile />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Explore spotlight carousel block. */
export function ExploreSpotlightSkeleton() {
  return (
    <section className="relative w-full min-w-0" aria-busy="true" aria-label="Loading spotlight">
      <div className="relative flex min-h-[min(48vh,380px)] w-full flex-col justify-end overflow-hidden border-2 border-border shadow md:min-h-[360px]">
        <SkGradientFill className="absolute inset-0" />
        <div className="relative z-10 flex flex-col justify-end p-6 md:p-10">
          <SkBar className="h-6 w-28 bg-primary-foreground/20" />
          <SkBar className="mt-5 h-10 w-full max-w-xl bg-primary-foreground/15" />
          <SkBar className="mt-4 h-16 max-w-lg bg-primary-foreground/12" />
          <SkBar className="mt-8 h-10 w-40 bg-primary-foreground/18" />
        </div>
      </div>
    </section>
  );
}

/** Trending stacked hero — front card + peeking back stack. */
export function TrendingStackedHeroSkeleton() {
  return (
    <section
      className="relative w-full min-w-0"
      aria-busy="true"
      aria-label="Loading trending hero"
    >
      <div className="relative mx-auto h-[20rem] w-full sm:h-[23rem] md:h-[26rem]">
        <div className="absolute right-[8%] top-0 z-0 h-full w-[38%] overflow-hidden border-2 border-border bg-card opacity-60">
          <SkGradientFill className="h-full w-full" />
        </div>
        <div className="absolute right-[0.5%] top-0 z-[1] h-full w-[30%] overflow-hidden border-2 border-border bg-card opacity-40">
          <SkGradientFill className="h-full w-full" pulse={false} />
        </div>
        <div className="absolute left-0 top-0 z-[2] h-full w-[64%] overflow-hidden border-2 border-border bg-card shadow">
          <SkGradientFill className="h-full w-full" />
          <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 p-4 sm:p-5">
            <SkBar className="h-3 w-24 bg-primary-foreground/25" />
            <SkBar className="h-8 w-[78%] bg-primary-foreground/18" />
            <SkBar className="h-4 w-[55%] bg-primary-foreground/14" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** One trending category lane (subheader + swiper). */
export function TrendingCategoryLaneSkeleton() {
  return (
    <div className="min-w-0 space-y-3" aria-hidden>
      <div className="flex flex-wrap items-center gap-2">
        <SkBar className="h-6 w-36" />
        <SkBar className="h-[42px] min-w-[10rem] flex-1" />
        <SkBlock className="h-[42px] w-10 border-2 border-border/60" />
        <SkBlock className="h-[42px] w-10 border-2 border-border/60" />
        <SkBar className="h-[42px] w-24" />
      </div>
      <CompactBlogPostsSwiperSkeleton slideCount={4} showToolbar={false} />
    </div>
  );
}

/** Full `/trending` page layout. */
export function TrendingPageSkeletonInner() {
  return (
    <div
      className={cn(
        SHELL_CONTENT_RAIL_CLASS,
        'flex min-h-0 flex-1 flex-col gap-10 pb-10 md:gap-12 md:pb-14'
      )}
      aria-busy="true"
    >
      <FollowingIntroSkeleton />
      <TrendingStackedHeroSkeleton />
      <section className="min-w-0 space-y-10" aria-label="Loading category lanes">
        {['tr-lane-0', 'tr-lane-1', 'tr-lane-2'].map((id) => (
          <TrendingCategoryLaneSkeleton key={id} />
        ))}
      </section>
    </div>
  );
}

/** Single squad discover card placeholder. */
export function ExploreSquadCardSkeleton() {
  return (
    <div
      className={cn(
        SQUAD_DISCOVER_CARD_SLIDE_CLASS,
        'h-[17.5rem] shrink-0 overflow-hidden border-[3px] border-border bg-background shadow'
      )}
      aria-hidden
    >
      <SkBlock className="h-[7rem] w-full border-0 bg-muted/35 md:h-[8rem]" />
      <div className="relative -mt-14 space-y-2 px-4 pb-3 md:px-5">
        <SkBlock className="size-12 border-[3px] bg-muted/30 md:size-16" />
        <div className="flex -space-x-2 pl-14 md:pl-[4.5rem]">
          {['sq-m0', 'sq-m1', 'sq-m2'].map((id) => (
            <SkBlock key={id} className="size-7 border-2 border-background bg-muted/40" />
          ))}
        </div>
        <SkBar className="mt-2 h-5 w-[72%]" />
        <SkBar className="h-3 w-[48%]" />
      </div>
    </div>
  );
}

/** Horizontal top-squads rail on explore. */
export function ExploreTopSquadsSkeleton({ count = 6 }: Readonly<{ count?: number }>) {
  return (
    <div
      className="ss-scrollbar-hide flex w-full min-w-0 flex-nowrap gap-4 overflow-x-hidden pb-1"
      aria-busy="true"
      aria-label="Loading squads"
    >
      {Array.from({ length: count }, (_, i) => `ex-sq-${i}`).map((id) => (
        <ExploreSquadCardSkeleton key={id} />
      ))}
    </div>
  );
}

export function ExploreHotTagsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => `ex-tag-${i}`).map((id) => (
        <SkBar key={id} className="h-10 w-24 sm:w-[7.25rem]" />
      ))}
    </div>
  );
}

/** Sector category tile — compact inline member row like live cards. */
export function ExploreSectorCategoryCardSkeleton({ hero = false }: Readonly<{ hero?: boolean }>) {
  return (
    <div
      className={cn(
        'relative min-h-[220px] overflow-hidden border-2 border-border shadow',
        hero ? 'md:col-span-2 md:min-h-[260px]' : 'bg-muted/20'
      )}
      aria-hidden
    >
      {hero ? <SkGradientFill className="absolute inset-0" /> : null}
      <div
        className={cn(
          'relative z-10 p-8 pb-8 pt-10 pr-24 sm:pr-28',
          hero && 'text-primary-foreground'
        )}
      >
        <SkBar className={cn('h-8 w-2/3', hero && 'h-10 w-3/4')} />
        <SkBar className="mt-4 h-14 w-full max-w-xs" />
        <SkBar className="mt-5 h-10 w-32" />
        <div className="mt-4 flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {['ex-av-0', 'ex-av-1', 'ex-av-2'].map((id) => (
              <SkBlock key={id} className="size-6 border-2 border-background bg-muted/45" />
            ))}
          </div>
          <SkBar className="h-2.5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ExploreSectorGridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 md:grid-cols-3"
      aria-busy="true"
      aria-label="Loading sectors"
    >
      <ExploreSectorCategoryCardSkeleton hero />
      {['ex-cat-1', 'ex-cat-2', 'ex-cat-3', 'ex-cat-4'].map((id) => (
        <ExploreSectorCategoryCardSkeleton key={id} />
      ))}
    </div>
  );
}

/** Full `/explore` page layout. */
export function ExplorePageSkeletonInner() {
  return (
    <div
      className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col gap-10 md:gap-12')}
      aria-busy="true"
    >
      <FollowingIntroSkeleton />
      <ExploreSpotlightSkeleton />
      <section className="space-y-4" aria-label="Loading top squads">
        <SkBar className="h-5 w-48" />
        <ExploreTopSquadsSkeleton />
      </section>
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-stretch lg:gap-6">
        <div className="flex min-h-0 border-2 border-border bg-card p-4 shadow sm:p-5 lg:col-span-1">
          <div className="flex min-h-[280px] w-full flex-col gap-3">
            <SkBar className="h-5 w-32" />
            <SkBar className="h-3 w-full max-w-md" />
            <ExploreHotTagsSkeleton />
            <SkBar className="mt-auto h-12 w-full" />
          </div>
        </div>
        <div className="flex min-h-0 flex-col lg:col-span-2">
          <CompactBlogPostsSwiperSkeleton slideCount={3} className="h-full min-h-0 flex-1" />
        </div>
      </section>
      <section className="space-y-4" aria-label="Loading sector categories">
        <SkBar className="h-5 w-56" />
        <ExploreSectorGridSkeleton />
      </section>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <SkBlock className="h-[7.25rem] animate-pulse border-4 border-border bg-card shadow" />
  );
}

function AchievementCardSkeletonTile() {
  return (
    <SkBlock className="flex h-[13.5rem] animate-pulse flex-col border-2 border-border bg-card p-4 shadow sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <SkBlock className="size-14 shrink-0 border-2 sm:size-16" />
        <SkBlock className="h-5 w-16 border-2" />
      </div>
      <SkBar className="h-3 w-[72%]" />
      <SkBar className="mt-2 h-2.5 w-full" />
      <SkBar className="mt-1.5 h-2.5 w-[88%]" />
      <SkBlock className="mt-auto h-2 w-full border-0 bg-muted/50" />
    </SkBlock>
  );
}

function InviteRosterRowSkeleton() {
  return (
    <li className="flex items-center gap-3 border-b-2 border-border/60 px-4 py-3 last:border-b-0">
      <SkBlock className="size-10 shrink-0 border-2" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkBar className="h-3 w-32" />
        <SkBar className="h-2 w-20" />
      </div>
      <SkBlock className="hidden h-8 w-16 shrink-0 sm:block" />
      <SkBlock className="h-6 w-14 shrink-0" />
    </li>
  );
}

/** `/invite` — intro, share panel, stats aside, referral roster. */
export function InvitePageSkeletonInner() {
  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')} aria-busy="true">
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <FollowingIntroSkeleton />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] lg:items-stretch xl:gap-6">
          <section className="min-w-0 border-4 border-border bg-card shadow">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-border bg-muted/30 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <SkBlock className="size-8 shrink-0 border-2" />
                <div className="space-y-2">
                  <SkBar className="h-2.5 w-28" />
                  <SkBar className="h-2 w-40" />
                </div>
              </div>
              <SkBlock className="h-10 w-36 shrink-0 border-2" />
            </div>
            <div className="space-y-5 p-4 sm:p-5 md:p-6">
              <div className="space-y-2">
                <SkBar className="h-2 w-24" />
                <SkBlock className="h-12 w-full border-2" />
              </div>
              <div className="space-y-2">
                <SkBar className="h-2 w-28" />
                <div className="flex flex-wrap gap-2">
                  <SkBlock className="h-10 w-36 border-2" />
                  <SkBlock className="h-10 w-28 border-2" />
                </div>
              </div>
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-3 lg:min-h-full">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </aside>
        </div>

        <section className="border-4 border-border bg-card shadow">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-border bg-muted/30 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <SkBlock className="size-8 shrink-0 border-2" />
              <div className="space-y-2">
                <SkBar className="h-2.5 w-32" />
                <SkBar className="h-2 w-44" />
              </div>
            </div>
          </div>
          <ul aria-label="Loading referral roster">
            {Array.from({ length: 5 }, (_, i) => `inv-${i}`).map((id) => (
              <InviteRosterRowSkeleton key={id} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** `/achievements` — intro, stats row, badge catalog grid. */
export function AchievementsPageSkeletonInner() {
  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')} aria-busy="true">
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <FollowingIntroSkeleton />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => `ach-stat-${i}`).map((id) => (
            <StatCardSkeleton key={id} />
          ))}
        </div>

        <section className="border-4 border-border bg-card shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-border bg-muted/30 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <SkBlock className="size-8 shrink-0 border-2" />
              <div className="space-y-2">
                <SkBar className="h-2.5 w-28" />
                <SkBar className="h-2 w-36" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }, (_, i) => `ach-tab-${i}`).map((id) => (
                <SkBlock key={id} className="h-8 w-24 border-2" />
              ))}
            </div>
          </div>
          <ul
            className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5"
            aria-label="Loading achievements"
          >
            {Array.from({ length: 6 }, (_, i) => `ach-card-${i}`).map((id) => (
              <li key={id} className="list-none">
                <AchievementCardSkeletonTile />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** Structural placeholder for `Navbar` before client mount (matches h-16 row + borders). */
export function NavbarSkeleton() {
  return (
    <header className="w-full border-b-2 border-border bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <div className={cn('flex h-16 items-center gap-4', SHELL_NAV_INNER_CLASS)}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Skeleton className="size-10 shrink-0 border-2 border-border/60 bg-muted/50" />
          <Skeleton className="h-7 w-28 shrink-0 sm:h-9 sm:w-36" />
        </div>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:flex"
          aria-hidden
        >
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-[4.5rem] shrink-0" />
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <Skeleton className="hidden h-9 max-w-[240px] flex-1 border-2 border-border/50 md:block" />
          <Skeleton className="size-10 shrink-0 border-2 border-border/50 md:hidden" />
          <Skeleton className="size-10 shrink-0 border-2 border-border/50" />
          <Skeleton className="hidden h-9 w-24 shrink-0 border-2 border-border/50 sm:block" />
        </div>
      </div>
    </header>
  );
}

export function SidebarSkeleton() {
  return (
    <aside
      className="fixed bottom-0 left-0 z-20 flex w-60 flex-col overflow-hidden border-r-2 border-border bg-background"
      style={{ top: 'calc(var(--header-height) - 1px)' }}
      aria-hidden
    >
      <div className="border-b-2 border-border p-4">
        <Skeleton className="h-10 w-full" />
      </div>
      <nav className="flex-1 space-y-6 p-4">
        <ul className="space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <li key={i}>
              <Skeleton className="h-9 w-full" />
            </li>
          ))}
        </ul>
        <div className="space-y-3">
          <Skeleton className="mx-3 h-3 w-24" />
          <ul className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <li key={i}>
                <Skeleton className="h-8 w-full" />
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <Skeleton className="mx-3 h-3 w-28" />
          <ul className="space-y-1">
            {[1, 2, 3].map((i) => (
              <li key={i}>
                <Skeleton className="h-8 w-full" />
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}

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
