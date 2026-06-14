"use client";
import { FollowingPostsGridSkeleton } from "./PageSkeletons";
import { SkBar, SkBlock, SkGradientFill } from "./primitives";
import { shell, squads } from "@/lib/styles";
import { cn } from "@/lib/core/utils";
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
export function SquadsPageBrowseSkeleton({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div
      className={cn("flex w-full min-w-0 flex-col gap-4", className)}
      aria-hidden
    >
      <div className="min-w-0 flex-1 space-y-3">
        <ul className={squads.discoverCardGrid}>
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
export function SquadDetailPageSkeleton() {
  return (
    <div
      className={cn(shell.contentRail, "relative min-h-0 flex-1")}
      aria-busy="true"
      aria-label="Loading squad"
    >
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-6 pb-10">
        <header className="relative z-20 mt-2 border-4 border-border shadow">
          <SkGradientFill className="absolute inset-0 z-0 h-full w-full overflow-hidden" />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/92 via-black/55 to-black/15"
            aria-hidden
          />
          <div className="relative z-10 flex min-h-[min(40vw,13rem)] flex-col justify-end px-4 pb-3.5 pt-5 sm:min-h-52 sm:px-5 sm:pb-4">
            <SkBar className="absolute right-4 top-4 z-20 h-2.5 w-24 sm:right-5 sm:top-5" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-2xl lg:max-w-[40rem]">
                <div className="flex items-start gap-3 sm:gap-3.5">
                  <SkBlock className="relative size-14 shrink-0 animate-pulse border-[3px] border-border bg-muted/35 sm:size-16" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <SkBar className="h-5 w-40 sm:w-52" />
                      <SkBlock className="h-4 w-16 animate-pulse border-2 border-border bg-muted/25" />
                    </div>
                    <SkBar className="h-2.5 w-full" />
                    <SkBar className="h-2.5 w-[92%]" />
                    <SkBar className="h-2.5 w-[70%]" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:pl-[4.25rem]">
                  <SkBar className="h-2 w-16" />
                  <SkBar className="h-2 w-14" />
                  <div className="flex -space-x-1.5">
                    {["fp-0", "fp-1", "fp-2"].map((id) => (
                      <SkBlock
                        key={id}
                        className="size-7 animate-pulse border-2 border-border bg-muted/30"
                      />
                    ))}
                  </div>
                  <SkBar className="h-2 w-20" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <SkBlock className="h-10 w-28 animate-pulse border-2 border-white/40 bg-black/35" />
                <SkBlock className="h-10 w-24 animate-pulse border-2 border-white/40 bg-black/35" />
                <SkBlock className="h-10 w-20 animate-pulse border-2 border-white/40 bg-black/35" />
                <SkBlock className="size-10 animate-pulse border-2 border-white/40 bg-black/35" />
              </div>
            </div>
          </div>
        </header>

        <FollowingPostsGridSkeleton count={6} />
      </div>
    </div>
  );
}
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
