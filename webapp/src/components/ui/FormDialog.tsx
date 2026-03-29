'use client';

import React from 'react';
import { Loader2, X } from 'lucide-react';
import { Dialog } from './Dialog';
import { cn } from '@/lib/utils';

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Dialog title (e.g. "Add work experience"). */
  title: React.ReactNode;
  /** Unique id for the title element (for aria-labelledby). */
  titleId: string;
  /** Optional short subtitle under the title. */
  subtitle?: React.ReactNode;
  /** Optional content on the right side of the header (e.g. Project/Publication toggle). */
  headerRight?: React.ReactNode;
  /** Form/content body. */
  children: React.ReactNode;
  /** Optional footer (e.g. Cancel + Save buttons). If not provided but showDefaultFooter, default Cancel/Save are used. */
  footer?: React.ReactNode;
  /** Extra class for the panel. Merged with default. */
  panelClassName?: string;
  /** Extra class for the content wrapper. */
  contentClassName?: string;
  /**
   * When true, covers the full panel (header, body, footer) with a dimming layer. The header close button
   * stays above the overlay so the dialog can still be dismissed.
   */
  interactionLock?: boolean;
  /** Centered content on the lock overlay (e.g. account-required message or custom spinner). */
  interactionLockContent?: React.ReactNode;
}

/**
 * Common dialog for forms (e.g. Add work experience, Add education).
 * Uses Dialog with a visible backdrop, title bar, scrollable body, and optional footer.
 */
export function FormDialog({
  open,
  onClose,
  title,
  titleId,
  subtitle,
  headerRight,
  children,
  footer,
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
        <header className="flex-shrink-0 border-b-2 border-border bg-muted/30 px-6 py-4 pr-14">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={titleId} className="text-base font-black uppercase tracking-wide text-foreground">
                {title}
              </h2>
              {headerRight != null && <div className="flex items-center">{headerRight}</div>}
            </div>
            {subtitle != null && (
              <p className="mt-1 text-xs font-medium text-muted-foreground max-w-md">{subtitle}</p>
            )}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer != null && (
          <footer className="flex-shrink-0 border-t-2 border-border bg-muted/20 px-6 py-4">
            {footer}
          </footer>
        )}
        {interactionLock && (
          <div
            className="absolute inset-0 z-[20] flex items-center justify-center bg-background/92 px-4 py-6 backdrop-blur-sm pointer-events-auto"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            {interactionLockContent ?? (
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading…</p>
              </div>
            )}
          </div>
        )}
        {/* After overlay in DOM + higher z-index so close stays clickable when the panel is locked */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-[30] flex size-9 items-center justify-center rounded-sm border-2 border-border bg-card text-muted-foreground shadow-[2px_2px_0_0_var(--border)] transition-colors hover:text-foreground hover:border-primary sm:right-6"
          aria-label="Close dialog"
        >
          <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </Dialog>
  );
}
