"use client";
import { useEffect, useId } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useScrollLock } from "@/hooks/useScrollLock";
import { RetroDialogCloseButton } from "@/components/ui/button";
export const DIALOG_Z_INDEX = 100;
export const DIALOG_Z_INDEX_STACKED = 120;
export const DIALOG_TITLE_BAR_BOTTOM_BORDER =
  "border-b-2 border-b-neutral-400/90 dark:border-b-zinc-600/90";
export const DIALOG_FOOTER_TOP_BORDER =
  "border-t-2 border-t-neutral-400/90 dark:border-t-zinc-600/90";
export const DIALOG_TITLE_HEADER_CLASS = cn(
  "shrink-0 bg-muted/30 px-6 py-3.5 pr-[4.75rem] sm:py-4 sm:pr-[5.75rem]",
  DIALOG_TITLE_BAR_BOTTOM_BORDER,
);
export const DIALOG_FOOTER_ACTIONS_CLASS = cn(
  "shrink-0 bg-muted/20 py-4",
  DIALOG_FOOTER_TOP_BORDER,
);
export const DIALOG_TITLE_ICON_BOX_CLASS =
  "flex size-10 shrink-0 items-center justify-center border-2 border-primary/35 bg-primary/10 text-primary dark:border-primary/45 dark:bg-primary/15 [&_svg]:size-5";
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  titleId?: string;
  title?: ReactNode;
  titleIcon?: ReactNode;
  description?: ReactNode;
  backdropClassName?: string;
  panelClassName?: string;
  contentClassName?: string;
  titleHeaderClassName?: string;
  titleHeaderEnd?: ReactNode;
  titleHeaderAccessory?: ReactNode;
  showCloseButton?: boolean;
  legacyCloseContentInset?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  zIndex?: number;
}
const defaultBackdropClass =
  "fixed inset-0 min-h-full min-w-full h-screen w-screen touch-none overscroll-none bg-black/60 backdrop-blur-[2px] pointer-events-auto";
const defaultPanelClass =
  "pointer-events-auto w-full max-w-md max-h-[90vh] overflow-y-auto border-2 border-border bg-card text-card-foreground shadow";
function DialogTitleHeaderBody({
  headingId,
  title,
  titleIcon,
  description,
}: Readonly<{
  headingId: string;
  title: ReactNode;
  titleIcon?: ReactNode;
  description?: ReactNode;
}>) {
  const descriptionNode =
    description == null ? null : (
      <p className="max-w-2xl text-xs font-medium leading-relaxed text-muted-foreground">
        {description}
      </p>
    );
  if (titleIcon == null) {
    return (
      <div className="min-w-0 space-y-1">
        <h2
          id={headingId}
          className="text-base font-black uppercase tracking-wide text-foreground"
        >
          {title}
        </h2>
        {descriptionNode}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-end gap-3 sm:gap-4">
      <span className={DIALOG_TITLE_ICON_BOX_CLASS} aria-hidden>
        {titleIcon}
      </span>
      <div className="min-w-0 flex-1 space-y-1 pb-px">
        <h2
          id={headingId}
          className="text-base font-black uppercase leading-tight tracking-wide text-foreground"
        >
          {title}
        </h2>
        {descriptionNode}
      </div>
    </div>
  );
}
export function Dialog({
  open,
  onClose,
  children,
  titleId,
  title,
  titleIcon,
  description,
  backdropClassName,
  panelClassName,
  contentClassName = "relative p-6 sm:p-8",
  titleHeaderClassName,
  titleHeaderEnd,
  titleHeaderAccessory,
  showCloseButton = true,
  legacyCloseContentInset = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  zIndex = DIALOG_Z_INDEX,
}: Readonly<DialogProps>) {
  const reactId = useId();
  const generatedTitleId = `dialog-title-${reactId.replaceAll(":", "")}`;
  const headingId = titleId ?? generatedTitleId;
  const useTitleHeader = title != null;
  const ariaLabelledBy = useTitleHeader ? headingId : titleId;
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, closeOnEscape]);
  useScrollLock(open);
  const overlay = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(defaultBackdropClass, backdropClassName)}
            style={{ zIndex }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            aria-hidden
          />
          <div
            className="fixed inset-0 min-h-screen min-w-full flex touch-none items-center justify-center overscroll-none p-4 pointer-events-none"
            style={{ zIndex }}
          >
            <motion.div
              key="dialog-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                defaultPanelClass,
                useTitleHeader && "flex flex-col overflow-hidden",
                panelClassName,
                "relative",
              )}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={ariaLabelledBy}
            >
              {useTitleHeader ? (
                <>
                  <header
                    className={cn(
                      DIALOG_TITLE_HEADER_CLASS,
                      titleHeaderClassName,
                    )}
                  >
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <DialogTitleHeaderBody
                          headingId={headingId}
                          title={title}
                          titleIcon={titleIcon}
                          description={description}
                        />
                      </div>
                      {titleHeaderEnd ? (
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pb-px sm:pb-0">
                          {titleHeaderEnd}
                        </div>
                      ) : null}
                    </div>
                    {titleHeaderAccessory ? (
                      <div className="mt-3 border-t-2 border-border/60 pt-3 dark:border-border/80">
                        {titleHeaderAccessory}
                      </div>
                    ) : null}
                  </header>
                  {showCloseButton ? (
                    <RetroDialogCloseButton
                      type="button"
                      mode="title"
                      onClick={onClose}
                      aria-label="Close"
                    >
                      <X
                        className="size-4 shrink-0"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    </RetroDialogCloseButton>
                  ) : null}
                  <div
                    className={cn(
                      "min-h-0 flex-1 flex flex-col",
                      contentClassName,
                    )}
                  >
                    {children}
                  </div>
                </>
              ) : (
                <>
                  {showCloseButton ? (
                    <RetroDialogCloseButton
                      type="button"
                      mode="legacy"
                      onClick={onClose}
                      aria-label="Close"
                    >
                      <X
                        className="size-4 shrink-0"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    </RetroDialogCloseButton>
                  ) : null}
                  <div
                    className={cn(
                      "relative",
                      contentClassName,
                      showCloseButton &&
                        legacyCloseContentInset &&
                        "pt-11 px-11 sm:pt-12 sm:px-12",
                    )}
                  >
                    {children}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
