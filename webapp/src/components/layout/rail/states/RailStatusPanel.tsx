"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/core/utils";
export type RailStatusPanelLayout = "centered" | "inline";
export type RailStatusPanelTone = "neutral" | "destructive";
export type RailStatusPanelDensity = "default" | "compact";
export type RailStatusPanelProps = Readonly<{
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  tone?: RailStatusPanelTone;
  layout?: RailStatusPanelLayout;
  density?: RailStatusPanelDensity;
  bordered?: boolean;
  className?: string;
  role?: "alert";
}>;
export function RailStatusPanel({
  icon,
  title,
  description,
  footer,
  tone = "neutral",
  layout = "centered",
  density = "default",
  bordered = true,
  className,
  role,
}: RailStatusPanelProps) {
  const isDestructive = tone === "destructive";
  const isCompact = density === "compact";
  const isInline = layout === "inline";
  if (isInline) {
    return (
      <div
        role={role}
        className={cn(
          "flex w-full flex-col gap-3 border-2 border-dashed p-4 sm:flex-row sm:items-start",
          isDestructive
            ? "border-destructive/40 bg-destructive/5"
            : "border-border bg-muted/10",
          className,
        )}
      >
        {icon}
        <div className="min-w-0 flex-1 space-y-1.5 text-left">
          <p className="font-mono text-xs font-black uppercase tracking-wide text-foreground">
            {title}
          </p>
          {description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {footer ? <div className="self-start sm:shrink-0">{footer}</div> : null}
      </div>
    );
  }
  return (
    <div
      role={role}
      className={cn(
        "relative flex flex-col items-center justify-center text-center",
        bordered ? (isCompact ? "px-4" : "px-6") : "px-0",
        bordered &&
          cn(
            "ss-empty-dashed-panel border-2 border-dashed",
            isDestructive
              ? "border-destructive/40 bg-destructive/5"
              : "border-border",
          ),
        isCompact
          ? "py-8"
          : isDestructive
            ? "py-14 sm:py-16"
            : "py-16 sm:py-20",
        className,
      )}
    >
      {icon}
      <p
        className={cn(
          "max-w-sm font-mono font-black uppercase tracking-wide text-foreground",
          isCompact ? "mt-4 text-xs" : "text-sm",
          !isCompact && (isDestructive ? "mt-6" : "mt-6"),
        )}
      >
        {title}
      </p>
      {description ? (
        <p
          className={cn(
            "mt-2 max-w-md leading-relaxed text-muted-foreground",
            isCompact ? "text-xs" : "text-sm",
          )}
        >
          {description}
        </p>
      ) : null}
      {footer ? (
        <div className={cn(isCompact ? "mt-5" : "mt-8")}>{footer}</div>
      ) : null}
    </div>
  );
}
