"use client";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { RetroEmptyStateAction } from "@/components/ui/button";
import { cn } from "@/lib/core/utils";
import { RailStatusPanel } from "./RailStatusPanel";
export type RailFeedEmptyStateAction = Readonly<{
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "default";
  icon?: ReactNode;
  ariaLabel?: string;
}>;
export type RailFeedEmptyStateProps = Readonly<{
  icon: LucideIcon;
  title: string;
  description: string;
  variant?: "default" | "filter";
  density?: "default" | "compact";
  actions?: ReadonlyArray<RailFeedEmptyStateAction>;
  className?: string;
  bordered?: boolean;
}>;
export function RailFeedEmptyState({
  icon: Icon,
  title,
  description,
  variant = "default",
  density = "default",
  actions,
  className,
  bordered = true,
}: RailFeedEmptyStateProps) {
  const isFilter = variant === "filter";
  const isCompact = density === "compact";
  const iconTile = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center border-2 border-border bg-card",
        isCompact
          ? "size-12 text-primary shadow"
          : isFilter
            ? "size-14 text-muted-foreground"
            : "size-16 text-primary shadow",
      )}
    >
      <Icon
        className={isCompact ? "size-6" : isFilter ? "size-7" : "size-8"}
        strokeWidth={2}
        aria-hidden
      />
    </span>
  );
  const footer =
    actions != null && actions.length > 0 ? (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {actions.map((action, i) => (
          <RetroEmptyStateAction
            key={action.href ?? action.ariaLabel ?? i}
            label={action.label}
            href={action.href}
            onClick={action.onClick}
            variant={
              action.variant ?? (variant === "filter" ? "primary" : "default")
            }
            icon={action.icon}
            ariaLabel={action.ariaLabel}
          />
        ))}
      </div>
    ) : undefined;
  return (
    <RailStatusPanel
      icon={iconTile}
      title={title}
      description={description}
      footer={footer}
      tone="neutral"
      layout="centered"
      density={isCompact ? "compact" : "default"}
      bordered={bordered}
      className={cn(isFilter && !isCompact && "py-14 sm:py-14", className)}
    />
  );
}
