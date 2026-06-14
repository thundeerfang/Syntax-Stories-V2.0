"use client";
import { Check, Lock } from "lucide-react";
import type { AchievementProgressItemDto } from "@/contracts/achievementsApi";
import { cn } from "@/lib/core/utils";
import {
  ACHIEVEMENT_CATEGORY_LABEL,
  ACHIEVEMENT_CATEGORY_TILE,
  AchievementSlugIcon,
} from "@/features/achievements/achievementIcons";
type AchievementStatus = "locked" | "in_progress" | "unlocked";
function resolveStatus(item: AchievementProgressItemDto): AchievementStatus {
  if (item.unlocked) return "unlocked";
  if (item.locked) return "locked";
  return "in_progress";
}
const STATUS_LABEL: Record<AchievementStatus, string> = {
  locked: "Locked",
  in_progress: "In progress",
  unlocked: "Unlocked",
};
export function AchievementCard({
  item,
}: Readonly<{
  item: AchievementProgressItemDto;
}>) {
  const status = resolveStatus(item);
  const pct =
    item.target > 0 ? Math.min(100, (item.current / item.target) * 100) : 0;
  const categoryStyle = ACHIEVEMENT_CATEGORY_TILE[item.category];
  return (
    <article
      className={cn(
        "relative flex h-full min-h-[13.5rem] flex-col border-2 border-border bg-card p-4 shadow transition-colors sm:p-5",
        status === "unlocked" &&
          "border-primary/50 bg-primary/[0.03] shadow-[3px_3px_0_0] shadow-primary/15",
        status === "locked" && "border-dashed bg-muted/20",
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={cn(
            "relative flex size-14 shrink-0 items-center justify-center border-2 shadow-sm sm:size-16",
            status === "locked"
              ? "border-border bg-muted/40 text-muted-foreground"
              : status === "unlocked"
                ? "border-primary bg-primary/15 text-primary"
                : categoryStyle.tile,
          )}
          aria-hidden
        >
          {status === "locked" ? (
            <>
              <AchievementSlugIcon
                slug={item.slug}
                className="size-6 opacity-25 sm:size-7"
                strokeWidth={2}
              />
              <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Lock
                  className="size-5 text-muted-foreground sm:size-6"
                  strokeWidth={2.25}
                />
              </span>
            </>
          ) : (
            <AchievementSlugIcon
              slug={item.slug}
              className="size-7 sm:size-8"
              strokeWidth={2}
            />
          )}
        </div>

        <span
          className={cn(
            "shrink-0 border-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
            status === "unlocked" &&
              "border-primary/40 bg-primary/10 text-primary",
            status === "locked" &&
              "border-border bg-muted/50 text-muted-foreground",
            status === "in_progress" &&
              "border-border bg-background text-foreground",
          )}
        >
          {status === "unlocked" ? (
            <span className="inline-flex items-center gap-1">
              <Check className="size-3" strokeWidth={3} aria-hidden />
              {STATUS_LABEL[status]}
            </span>
          ) : (
            STATUS_LABEL[status]
          )}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={cn(
              "font-mono text-sm font-black uppercase leading-tight tracking-wide",
              status === "locked" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {item.title}
          </h3>
          <span
            className={cn(
              "border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest",
              status === "locked"
                ? "border-border bg-muted/30 text-muted-foreground"
                : categoryStyle.badge,
            )}
          >
            {ACHIEVEMENT_CATEGORY_LABEL[item.category]}
          </span>
        </div>

        <p
          className={cn(
            "mt-2 flex-1 text-xs font-medium leading-relaxed",
            status === "locked"
              ? "text-muted-foreground/80"
              : "text-muted-foreground",
          )}
        >
          {status === "locked"
            ? "Complete earlier milestones to reveal this badge."
            : item.description}
        </p>

        <div className="mt-4 space-y-2 border-t-2 border-dashed border-border/60 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "border-2 px-2 py-0.5 text-[10px] font-black tabular-nums tracking-wide",
                status === "unlocked"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground",
              )}
            >
              +{item.points} pts
            </span>

            {status === "unlocked" && item.unlockedAt ? (
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary">
                {new Date(item.unlockedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            ) : null}

            {status === "in_progress" ? (
              <span className="text-[9px] font-bold uppercase tabular-nums tracking-widest text-muted-foreground">
                {item.current}/{item.target} · {Math.round(pct)}%
              </span>
            ) : null}
          </div>

          {status === "in_progress" ? (
            <div className="h-2 border-2 border-border bg-muted/30">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : null}

          {status === "locked" ? (
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Progress hidden until unlocked
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
