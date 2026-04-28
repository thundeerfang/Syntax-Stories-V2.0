'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Dialog,
  DIALOG_FOOTER_TOP_BORDER,
  DIALOG_TITLE_HEADER_CLASS,
  DIALOG_TITLE_ICON_BOX_CLASS,
} from './Dialog';
import { cn } from '@/lib/utils';

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Dialog title (e.g. "Add work experience"). */
  title: React.ReactNode;
  /** Unique id for the title element (for aria-labelledby). */
  titleId: string;
  /** Icon in the standard bordered tile next to `title` (same as `Dialog` `titleIcon`). */
  titleIcon?: React.ReactNode;
  /** Optional short subtitle under the title. */
  subtitle?: React.ReactNode;
  /** Merged onto the subtitle paragraph (e.g. single-line clamp, smaller type). */
  subtitleClassName?: string;
  /** Optional content on the right side of the header (e.g. Project/Publication toggle). */
  headerRight?: React.ReactNode;
  /** Form/content body. */
  children: React.ReactNode;
  /** Optional footer (e.g. Cancel + Save buttons). If not provided but showDefaultFooter, default Cancel/Save are used. */
  footer?: React.ReactNode;
  /** Extra class for the footer strip (e.g. align action buttons). */
  footerClassName?: string;
  /** Extra class for the panel. Merged with default. */
  panelClassName?: string;
  /** Extra class for the content wrapper. */
  contentClassName?: string;
  /**
   * When true, covers the full panel (header, body, footer) with a dimming layer. The header close button
   * stays above the overlay so the dialog can still be dismissed.
   */
  interactionLock?: boolean;
  /**
   * Custom overlay while `interactionLock` is true (e.g. layout-matched skeletons).
   * When omitted, a generic crop/form-shaped skeleton is shown, centered in the body region.
   */
  interactionLockContent?: React.ReactNode;
}

/** Default busy overlay: approximates image crop / form dialogs (not feedback-specific). */
function FormDialogDefaultInteractionSkeleton() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="grid gap-1.5">
        <Skeleton className="h-2.5 w-24 rounded-sm" />
        <Skeleton className="h-9 w-full rounded-none" />
      </div>
      <Skeleton className="min-h-[14rem] w-full rounded-none" />
      <div className="flex flex-wrap justify-end gap-2">
        <Skeleton className="h-12 min-h-12 w-28 rounded-none" />
        <Skeleton className="h-12 min-h-12 w-36 rounded-none" />
      </div>
    </div>
  );
}

/**
 * Common dialog for forms (e.g. Add work experience, Add education).
 * Uses Dialog with a visible backdrop, title bar, scrollable body, and optional footer.
 */
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
  contentClassName,
  interactionLock = false,
  interactionLockContent,
}: Readonly<FormDialogProps>) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      showCloseButton={false}
      panelClassName={cn('max-w-lg overflow-hidden flex flex-col max-h-[90vh]', panelClassName)}
      contentClassName={cn('p-0 flex flex-col min-h-0 max-h-[90vh]', contentClassName)}
    >
      <div className="relative flex min-h-0 min-h-[max(16rem,32vh)] flex-1 flex-col overflow-hidden">
        {/* Header: reserve right space for the floating close (sibling below) so title never sits under the X */}
        <header className={DIALOG_TITLE_HEADER_CLASS}>
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
            {titleIcon == null ? (
              <div className="min-w-0 flex-1 space-y-1">
                <h2 id={titleId} className="text-base font-black uppercase leading-tight tracking-wide text-foreground">
                  {title}
                </h2>
                {subtitle == null ? null : (
                  <p
                    className={cn(
                      'max-w-2xl text-xs font-medium leading-relaxed text-muted-foreground',
                      subtitleClassName
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
                  <h2 id={titleId} className="text-base font-black uppercase leading-tight tracking-wide text-foreground">
                    {title}
                  </h2>
                  {subtitle == null ? null : (
                    <p
                      className={cn(
                        'max-w-2xl text-xs font-medium leading-relaxed text-muted-foreground',
                        subtitleClassName
                      )}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}
            {headerRight != null && (
              <div className="flex shrink-0 items-center gap-2 self-end pb-0.5 pr-1 sm:pr-2">{headerRight}</div>
            )}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer != null && (
          <footer
            className={cn('flex-shrink-0 bg-muted/20 px-6 py-4', DIALOG_FOOTER_TOP_BORDER, footerClassName)}
          >
            {footer}
          </footer>
        )}
        {interactionLock && (
          <div
            className="absolute inset-0 z-[20] flex min-h-0 flex-col bg-background/92 backdrop-blur-sm pointer-events-auto"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            {interactionLockContent != null ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{interactionLockContent}</div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-6">
                <FormDialogDefaultInteractionSkeleton />
              </div>
            )}
          </div>
        )}
        {/* After overlay in DOM + higher z-index so close stays clickable when the panel is locked */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-3.5 z-[30] flex size-9 shrink-0 items-center justify-center rounded-sm border-2 border-border bg-card text-muted-foreground shadow-[2px_2px_0_0_var(--border)] transition-colors hover:border-primary hover:text-foreground sm:right-6 sm:top-4"
          aria-label="Close dialog"
        >
          <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </Dialog>
  );
}
