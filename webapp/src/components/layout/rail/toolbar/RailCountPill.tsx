"use client";
import { RankCountPill } from "./RankCountPill";
import { cn } from "@/lib/core/utils";
import { layout } from "@/lib/styles";
export const RAIL_COUNT_PILL_CLASS = layout.railCountPillSize;
export function RailCountPillLoading() {
  return (
    <span
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 font-mono text-[10px] font-black text-primary ring-1 ring-inset ring-primary/20 dark:bg-primary/16"
      aria-hidden
    >
      —
    </span>
  );
}
export function RailCountPill({
  count,
  className,
  "aria-label": ariaLabel,
}: Readonly<{
  count: number;
  className?: string;
  "aria-label"?: string;
}>) {
  return (
    <RankCountPill
      count={count}
      className={cn(RAIL_COUNT_PILL_CLASS, className)}
      aria-label={ariaLabel}
    />
  );
}
export function RailCountPillPair({
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  separator = "of",
  className,
}: Readonly<{
  primary: number;
  secondary: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  separator?: string;
  className?: string;
}>) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <RailCountPill count={primary} aria-label={primaryLabel} />
      <span className="font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {separator}
      </span>
      <RailCountPill count={secondary} aria-label={secondaryLabel} />
    </span>
  );
}
