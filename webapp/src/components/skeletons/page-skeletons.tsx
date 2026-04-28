'use client';

import { SkBar, SkBlock } from './primitives';
import { cn } from '@/lib/utils';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';

/** Home feed area (inside `MainLayout` content slot). */
export function HomePageSkeletonInner() {
  return (
    <div className="relative mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <SkBlock className="border-2 border-border bg-card p-6 shadow-[8px_8px_0_0_var(--border)] md:p-8 md:shadow-[12px_12px_0_0_var(--border)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <SkBar className="h-6 w-40" />
            <SkBar className="h-12 w-full max-w-md" />
            <SkBar className="h-3 w-full max-w-xl" />
            <SkBar className="h-3 w-full max-w-lg" />
          </div>
          <SkBlock className="h-36 w-full shrink-0 border-2 border-dashed border-border lg:max-w-xs animate-pulse" />
        </div>
      </SkBlock>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => `hf-${i}`).map((id) => (
          <div
            key={id}
            className="flex flex-col border-2 border-border bg-card shadow-[6px_6px_0_0_var(--border)] overflow-hidden"
          >
            <div className="space-y-2 border-b-2 border-border p-4">
              <SkBar className="h-2 w-24" />
              <SkBar className="h-4 max-w-[280px] w-[85%]" />
            </div>
            <SkBlock className="aspect-[16/10] w-full animate-pulse" />
            <div className="space-y-2 p-4">
              <SkBar className="h-2 w-full" />
              <SkBar className="h-2 w-[80%]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Lightweight placeholder rows — no accent colors or heavy chrome. */
function ProfileAccordionRowSk({ showHeaderAction = true }: Readonly<{ showHeaderAction?: boolean }>) {
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

function ProfileRightColumnSkeleton({ variant }: Readonly<{ variant: ProfilePageSkeletonVariant }>) {
  const isOwner = variant === 'owner';

  if (!isOwner) {
    return (
      <>
        <div className="border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
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

        <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
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

        <div className="space-y-4 border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
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

        <div className="border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
          <div className="mb-3 flex items-center gap-2">
            <SkBlock className="size-8 animate-pulse border-2 border-border bg-muted/30" />
            <div className="space-y-1">
              <SkBar className="h-2 w-28" />
              <SkBar className="h-2 w-40" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {['l1', 'l2', 'l3', 'l4'].map((k) => (
              <SkBlock key={k} className="size-11 animate-pulse border-2 border-border bg-card shadow-[2px_2px_0px_0px_var(--border)]" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
        <div className="flex items-center gap-3">
          <SkBlock className="size-9 animate-pulse border-2 border-border shadow-[2px_2px_0px_0px_var(--border)]" />
          <div className="space-y-1">
            <SkBar className="h-2 w-28" />
            <SkBar className="h-2 w-24" />
          </div>
        </div>
        <SkBlock className="h-7 w-12 animate-pulse rounded-full border-2 border-border" />
      </div>

      <div className="border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
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

      <div className="space-y-4 border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
        <SkBar className="h-2 w-32" />
        <SkBar className="h-2 w-full max-w-xs" />
        <SkBlock className="flex min-h-[3rem] w-full animate-pulse items-center justify-between border-2 border-border bg-muted/30 p-3" />
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          {['x1', 'x2', 'x3', 'x4'].map((k) => (
            <SkBlock key={k} className="size-10 animate-pulse border-2 border-border bg-muted/30" />
          ))}
        </div>
      </div>

      <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SkBar className="h-2 w-36" />
            <SkBlock className="size-4 animate-pulse border-2 border-border" />
          </div>
          <SkBlock className="h-8 w-36 animate-pulse border-2 border-border shadow-[2px_2px_0px_0px_var(--border)]" />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {['m1', 'm2', 'm3'].map((k) => (
            <SkBlock key={k} className="h-7 w-28 animate-pulse border-2 border-border bg-muted/40" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex min-h-0 flex-row items-stretch border-2 border-border bg-muted/5 p-3 shadow-[2px_2px_0px_0px_var(--border)]"
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

      <div className="space-y-6 border-4 border-border bg-card p-5 shadow-[8px_8px_0px_0px_var(--border)]">
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
                className="border-2 border-border bg-card p-2 text-center shadow-[2px_2px_0px_0px_var(--border)] animate-pulse"
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
                <SkBlock key={id} className="size-3 shrink-0 animate-pulse border border-border/60" />
              ))}
            </div>
          </SkBlock>
        </div>
      </div>

      <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
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

      <div className="space-y-4 border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
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
        isOwner && 'ss-profile-readonly',
      )}
    >
      <div className={SHELL_CONTENT_RAIL_CLASS}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT — matches lg:col-span-8 space-y-8 */}
        <div className="space-y-8 lg:col-span-8">
          {/* HEADER */}
          <section className="overflow-hidden border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)]">
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
                className="absolute -top-14 left-6 z-20 size-28 border-4 border-border bg-card shadow-[6px_6px_0px_0px_hsl(var(--primary))] md:size-36"
                aria-hidden
              >
                <div className="absolute inset-0 animate-pulse bg-muted/40" />
              </div>
              <div className="flex flex-col gap-4">
                <div
                  className={cn(
                    'flex flex-col justify-between gap-4 md:items-start',
                    isOwner ? 'md:flex-row' : 'md:flex-row md:items-end',
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
                      <SkBlock className="h-10 w-24 animate-pulse border-2 border-border shadow-[3px_3px_0px_0px_var(--border)]" />
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
                  <div className="absolute bottom-1 right-1 size-3 border-r-2 border-b-2 border-border/50" aria-hidden />
                </div>
                {/* Stats — owner: dashed gray strip; public: dashed border strip + dividers */}
                <div
                  className={cn(
                    'mt-8 flex flex-wrap border-4 border-dashed bg-muted/5 p-4',
                    isOwner
                      ? 'gap-6 border-gray-300 dark:border-border'
                      : 'gap-3 border-border',
                  )}
                >
                  {['a', 'b', 'c', 'd', 'e'].map((id, i) => (
                    <div
                      key={id}
                      className={cn(
                        'flex items-center gap-2',
                        !isOwner && i < 4 && 'border-r-2 border-border/50 pr-4',
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
            <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
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
                  <SkBlock className="h-28 animate-pulse border-2 border-border bg-card shadow-[2px_2px_0px_0px_var(--border)]" />
                  <SkBlock className="h-28 animate-pulse border-2 border-border bg-card shadow-[2px_2px_0px_0px_var(--border)]" />
                </div>
              </div>
            </section>
          ) : (
            <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
              <SkBar className="h-3 w-36" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {['pb1', 'pb2', 'pb3', 'pb4'].map((k) => (
                  <div
                    key={k}
                    className="overflow-hidden border-2 border-border bg-card shadow-[2px_2px_0px_0px_var(--border)]"
                  >
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
          <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SkBlock className="size-4 shrink-0 animate-pulse border border-border" />
                <SkBar className="h-3 w-28" />
              </div>
              {isOwner ? <SkBlock className="h-9 w-28 animate-pulse border-2 border-border" /> : null}
            </div>
            <div className="flex gap-1 border-b-4 border-border pb-3">
              {(isOwner ? (['Posts', 'Replies', 'Repost'] as const) : (['Posts', 'Repost'] as const)).map((t) => (
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
            <div className="flex flex-col items-center gap-6 border-4 border-border bg-primary p-6 shadow-[8px_8px_0px_0px_var(--border)] md:flex-row">
              <div className="size-16 shrink-0 -rotate-3 animate-pulse rounded-none border-4 border-primary-foreground/40 bg-primary-foreground/15" />
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="mx-auto h-4 max-w-full w-56 rounded-none border-2 border-primary-foreground/40 bg-primary-foreground/20 animate-pulse md:mx-0" />
                <div className="mx-auto h-2 max-w-md w-full rounded-none border border-primary-foreground/30 bg-primary-foreground/15 animate-pulse md:mx-0" />
              </div>
              <div className="h-12 w-40 shrink-0 animate-pulse rounded-none border-4 border-primary-foreground/50 bg-primary-foreground/25" />
            </div>
          ) : null}

          {/* Stack & Tools | My Setup */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
              <div className="flex items-center justify-between gap-2 border-b-2 border-border px-2 pb-3 md:px-0">
                <div className="flex items-center gap-2">
                  <SkBlock className="size-8 animate-pulse border-2 border-border" />
                  <SkBar className="h-3 w-32" />
                </div>
                {isOwner ? <SkBlock className="size-8 animate-pulse border-2 border-border" /> : null}
              </div>
              <div className="flex flex-wrap gap-2 py-1">
                {['s1', 's2', 's3', 's4', 's5'].map((k) => (
                  <SkBlock key={k} className="h-11 w-[7.5rem] animate-pulse border-2 border-border bg-muted/10 shadow-[2px_2px_0px_0px_var(--border)]" />
                ))}
              </div>
            </section>
            <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
              <div className="flex items-center justify-between gap-2 border-b-2 border-border px-2 pb-3 md:px-0">
                <div className="flex items-center gap-2">
                  <SkBlock className="size-8 animate-pulse border-2 border-border" />
                  <SkBar className="h-3 w-28" />
                </div>
                {isOwner ? <SkBlock className="size-8 animate-pulse border-2 border-border" /> : null}
              </div>
              <div className="flex gap-3 overflow-hidden py-1">
                {['u1', 'u2'].map((k) => (
                  <div
                    key={k}
                    className="w-[240px] shrink-0 overflow-hidden border-2 border-border bg-muted/10 shadow-[2px_2px_0px_0px_var(--border)]"
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
        'flex h-screen max-h-screen min-h-0 flex-col overflow-hidden border-2 border-border bg-background font-mono text-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]',
        SHELL_CONTENT_RAIL_CLASS,
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
          <p className="mb-2 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Tools</p>
          <div className="space-y-1.5">
            {Array.from({ length: 6 }, (_, i) => `tw-${i}`).map((id) => (
              <div key={id} className="flex items-center gap-2 rounded border border-transparent px-2 py-1">
                <SkBlock className="size-3.5 shrink-0 border-0 bg-muted/40" />
                <SkBar className="h-1.5 flex-1 max-w-[9rem]" />
              </div>
            ))}
          </div>
          <p className="mb-2 mt-5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Stats</p>
          <SkBlock className="h-16 w-full border border-border/40 bg-muted/10" />
        </aside>

        {/* Centre — title + summary + body */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/50 lg:border-x">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <p className="mb-1 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Title</p>
            <SkBar className="mb-6 h-4 w-full max-w-xl" />
            <p className="mb-1 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Summary</p>
            <div className="mb-8 space-y-1.5">
              <SkBar className="h-1.5 w-full" />
              <SkBar className="h-1.5 w-[92%]" />
              <SkBar className="h-1.5 w-[70%]" />
            </div>
            <p className="mb-2 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Body</p>
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
          <p className="mb-2 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Publish</p>
          <div className="space-y-2">
            <SkBlock className="h-9 w-full border border-border/50 bg-muted/15" />
            <SkBlock className="h-9 w-full border border-border/40 bg-muted/10" />
          </div>
          <p className="mb-2 mt-5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Thumbnail</p>
          <SkBlock className="aspect-video w-full max-w-full border border-border/40 bg-muted/10" />
        </aside>
      </div>
    </div>
  );
}
