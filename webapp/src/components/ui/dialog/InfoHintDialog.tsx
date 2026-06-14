"use client";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { Dialog, DIALOG_Z_INDEX_STACKED } from "./dialogs";
import { cn } from "@/lib/core/utils";
export type InfoHintDialogProps = Readonly<{
  title: string;
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
  closeLabel?: string;
}>;
export function InfoHintDialog({
  title,
  children,
  ariaLabel,
  className,
  closeLabel = "Close",
}: InfoHintDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-primary",
          className,
        )}
        aria-label={ariaLabel ?? `Learn more about ${title}`}
      >
        <CircleHelp className="size-3.5" strokeWidth={2.5} aria-hidden />
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        showCloseButton={false}
        panelClassName="max-w-sm overflow-hidden border-primary/30 dark:border-primary/35"
        contentClassName="p-0"
        legacyCloseContentInset={false}
        zIndex={DIALOG_Z_INDEX_STACKED}
      >
        <div className="min-h-full w-full bg-gradient-to-b from-primary/18 via-primary/8 to-card dark:from-primary/22 dark:via-primary/10 dark:to-card">
          <div className="flex flex-col items-center px-6 pb-6 pt-10 text-center sm:px-8 sm:pb-8 sm:pt-12">
            <span
              className="flex size-16 shrink-0 items-center justify-center border-2 border-primary/40 bg-primary/15 text-primary shadow dark:border-primary/50 dark:bg-primary/20"
              aria-hidden
            >
              <CircleHelp className="size-8 stroke-[2.5]" />
            </span>
            <h2
              id={titleId}
              className="mt-5 max-w-[18rem] text-base font-black uppercase tracking-wide text-foreground sm:text-lg"
            >
              {title}
            </h2>
            <div className="mt-3 w-full max-w-[20rem] space-y-3 text-left text-sm leading-relaxed text-muted-foreground">
              {children}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                "mt-8 w-full border-2 border-primary bg-primary px-6 py-3.5 font-black text-xs uppercase tracking-widest text-primary-foreground shadow",
                "transition-all hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
              )}
            >
              {closeLabel}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
