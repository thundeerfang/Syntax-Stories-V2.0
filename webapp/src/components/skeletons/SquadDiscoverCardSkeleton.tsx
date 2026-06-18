"use client";
import { SkBar, SkBlock } from "./primitives";
import { squads } from "@/lib/styles";
import { cn } from "@/lib/core/utils";

export function SquadDiscoverCardSkeleton({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "relative mx-auto flex w-full flex-col overflow-hidden",
        squads.discoverCardMax,
        squads.discoverCardMinH,
        "border-[3px] border-border bg-background shadow",
        className,
      )}
      aria-hidden
    >
      <SkBlock
        className={cn(squads.discoverCardBanner, "border-0 bg-muted/35")}
      />
      <div className={squads.discoverCardBodyOverlap}>
        <div className="relative z-20 flex items-end gap-3.5 pb-2">
          <SkBlock
            className={cn(
              squads.discoverCardIcon,
              "animate-pulse bg-muted/30",
            )}
          />
          <div className="relative min-w-0 flex-1 pt-7">
            <div className="flex -space-x-2">
              {["sq-m0", "sq-m1", "sq-m2"].map((id) => (
                <SkBlock
                  key={id}
                  className="size-7 border-2 border-background bg-muted/40"
                />
              ))}
            </div>
            <SkBar className="mt-1.5 h-2 w-[45%]" />
          </div>
        </div>
        <div className="relative z-10 mt-2 space-y-1.5 pb-3">
          <SkBar className="h-5 w-[72%]" />
          <SkBar className="h-3 w-[48%]" />
        </div>
      </div>
    </div>
  );
}
