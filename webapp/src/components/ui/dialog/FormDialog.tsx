"use client";
import React from "react";
import { X } from "lucide-react";
import { Skeleton } from "../feedback/Skeleton";
import {
  Dialog,
  DIALOG_FOOTER_TOP_BORDER,
  DIALOG_TITLE_HEADER_CLASS,
  DIALOG_TITLE_ICON_BOX_CLASS,
} from "./dialogs";
import { cn } from "@/lib/core/utils";
export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  titleId: string;
  titleIcon?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtitleClassName?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  footerClassName?: string;
  panelClassName?: string;
  backdropClassName?: string;
  contentClassName?: string;
  bodyClassName?: string;
  interactionLock?: boolean;
  interactionLockContent?: React.ReactNode;
}
function FormDialogDefaultInteractionSkeleton() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="grid gap-1.5">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="min-h-[14rem] w-full" />
      <div className="flex flex-wrap justify-end gap-2">
        <Skeleton className="h-12 min-h-12 w-28" />
        <Skeleton className="h-12 min-h-12 w-36" />
      </div>
    </div>
  );
}
export function FormDialog({
  open,
  onClose,
  title,
  titleIcon,
  titleId,
  subtitle,
  subtitleClassName,
  headerRight,
  children,
  footer,
  footerClassName,
  panelClassName,
  backdropClassName,
  contentClassName,
  bodyClassName,
  interactionLock = false,
  interactionLockContent,
}: Readonly<FormDialogProps>) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      showCloseButton={false}
      backdropClassName={backdropClassName}
      panelClassName={cn(
        "max-w-lg overflow-hidden flex flex-col max-h-[90vh]",
        panelClassName,
      )}
      contentClassName={cn(
        "p-0 flex flex-col min-h-0 max-h-[90vh]",
        contentClassName,
      )}
    >
      <div className="relative flex min-h-0 min-h-[max(16rem,32vh)] flex-1 flex-col overflow-hidden">
        <header className={DIALOG_TITLE_HEADER_CLASS}>
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
            {titleIcon == null ? (
              <div className="min-w-0 flex-1 space-y-1">
                <h2
                  id={titleId}
                  className="text-base font-black uppercase leading-tight tracking-wide text-foreground"
                >
                  {title}
                </h2>
                {subtitle == null ? null : (
                  <p
                    className={cn(
                      "max-w-2xl text-xs font-medium leading-relaxed text-muted-foreground",
                      subtitleClassName,
                    )}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-end gap-3 sm:gap-4">
                <span className={DIALOG_TITLE_ICON_BOX_CLASS} aria-hidden>
                  {titleIcon}
                </span>
                <div className="min-w-0 flex-1 space-y-1 pb-px">
                  <h2
                    id={titleId}
                    className="text-base font-black uppercase leading-tight tracking-wide text-foreground"
                  >
                    {title}
                  </h2>
                  {subtitle == null ? null : (
                    <p
                      className={cn(
                        "max-w-2xl text-xs font-medium leading-relaxed text-muted-foreground",
                        subtitleClassName,
                      )}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}
            {headerRight != null && (
              <div className="flex shrink-0 items-center gap-2 self-end pb-0.5 pr-1 sm:pr-2">
                {headerRight}
              </div>
            )}
          </div>
        </header>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-6 py-5",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer != null && (
          <footer
            className={cn(
              "flex-shrink-0 bg-muted/20 px-6 py-4",
              DIALOG_FOOTER_TOP_BORDER,
              footerClassName,
            )}
          >
            {footer}
          </footer>
        )}
        {interactionLock && (
          <div
            className={cn(
              "absolute inset-0 z-[20] flex min-h-0 flex-col pointer-events-auto",
              "bg-background/90 backdrop-blur-[2px]",
              "dark:bg-black/88 dark:backdrop-blur-md",
            )}
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            {interactionLockContent != null ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {interactionLockContent}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-6">
                <FormDialogDefaultInteractionSkeleton />
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-3.5 z-[30] flex size-9 shrink-0 items-center justify-center border-2 border-border bg-card text-muted-foreground shadow transition-colors hover:border-primary hover:text-foreground sm:right-6 sm:top-4"
          aria-label="Close dialog"
        >
          <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </Dialog>
  );
}
