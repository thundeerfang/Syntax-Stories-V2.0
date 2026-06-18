"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/core/utils";

export type DialogInteractionLoaderProps = Readonly<{
  statusLine?: ReactNode;
  className?: string;
  logoClassName?: string;
  progressClassName?: string;
}>;

/** Centered brand mark + square-corner indeterminate bar for dialog loading overlays. */
export function DialogInteractionLoader({
  statusLine,
  className,
  logoClassName,
  progressClassName,
}: DialogInteractionLoaderProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-xs flex-col items-center justify-center gap-5 text-center",
        className,
      )}
      role="presentation"
    >
      <img
        src="/svg/logo.png"
        alt=""
        aria-hidden
        className={cn(
          "size-16 object-contain sm:size-[4.5rem]",
          logoClassName,
        )}
      />
      {statusLine != null ? (
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          {statusLine}
        </p>
      ) : null}
      <div
        className={cn(
          "h-1.5 w-full max-w-[12rem] overflow-hidden rounded-none border border-border bg-muted/40",
          progressClassName,
        )}
        aria-hidden
      >
        <div className="h-full w-2/5 rounded-none bg-primary animate-dialog-progress" />
      </div>
    </div>
  );
}
