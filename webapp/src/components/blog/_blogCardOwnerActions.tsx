"use client";
import { ArchiveRestore, Pencil, Skull, Trash2 } from "lucide-react";
import { RetroCardFooterButton } from "@/components/ui/button";
import { cn } from "@/lib/core/utils";
export type BlogCardOwnerActions =
  | {
      mode: "published";
      viewHref: string;
      onEdit: () => void;
      onDelete: () => void;
    }
  | {
      mode: "draft";
      onEdit: () => void;
      onDelete: () => void;
    }
  | {
      mode: "deleted";
      restoreBusy?: boolean;
      deletedMeta: string;
      onRestore: () => void;
      onPurge: () => void;
    };
export function BlogCardOwnerActionsOverlay({
  actions,
}: Readonly<{
  actions: BlogCardOwnerActions;
}>) {
  const mode = actions.mode;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-20 flex flex-col justify-end",
        "opacity-0",
        "transform-gpu transition-opacity duration-300 ease-out",
        "motion-reduce:transition-none motion-reduce:duration-0",
        "group-hover/card:pointer-events-auto group-hover/card:opacity-100",
        "group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100",
      )}
    >
      <div
        className="min-h-0 flex-1 bg-gradient-to-t from-muted/75 via-muted/30 to-transparent dark:from-black/55 dark:via-black/25 dark:to-transparent"
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 flex w-full flex-row items-stretch gap-2 border-t-2 border-border bg-card/95 p-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-border/40 dark:bg-black/88 dark:shadow-none",
          "translate-y-2 transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
          "motion-reduce:translate-y-0 motion-reduce:transition-none",
          "group-hover/card:translate-y-0 group-focus-within/card:translate-y-0",
        )}
      >
        {mode === "published" ? (
          <RetroCardFooterButton
            href={actions.viewHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            View
          </RetroCardFooterButton>
        ) : null}
        {mode === "published" || mode === "draft" ? (
          <>
            <RetroCardFooterButton type="button" onClick={actions.onEdit}>
              <Pencil className="size-3" aria-hidden />
              Edit
            </RetroCardFooterButton>
            <RetroCardFooterButton
              type="button"
              variant="danger"
              onClick={actions.onDelete}
              aria-label="Move post to trash"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete
            </RetroCardFooterButton>
          </>
        ) : null}
        {mode === "deleted" ? (
          <>
            <RetroCardFooterButton
              type="button"
              disabled={actions.restoreBusy}
              onClick={actions.onRestore}
            >
              <ArchiveRestore className="size-3.5" aria-hidden />
              {actions.restoreBusy ? "…" : "Restore"}
            </RetroCardFooterButton>
            <RetroCardFooterButton
              type="button"
              variant="danger"
              onClick={actions.onPurge}
            >
              <Skull className="size-3.5" aria-hidden />
              Delete forever
            </RetroCardFooterButton>
          </>
        ) : null}
      </div>
    </div>
  );
}
