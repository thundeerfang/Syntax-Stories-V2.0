'use client';

import { useEffect, useId } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** z-index for dialog overlay so it appears above navbar (z-40) and other layout. */
const DIALOG_Z = 100;

/**
 * 2px rules for title bar bottom + footer top: readable on `bg-muted/*` in light and dark.
 * Dark mode uses a lighter zinc edge so the line does not disappear into the card.
 */
export const DIALOG_TITLE_BAR_BOTTOM_BORDER =
  'border-b-2 border-b-neutral-400/90 dark:border-b-zinc-600/90';

export const DIALOG_FOOTER_TOP_BORDER = 'border-t-2 border-t-neutral-400/90 dark:border-t-zinc-600/90';

/**
 * Title bar surface + bottom rule (shared with `FormDialog` and `Dialog` `title` / `description` mode).
 */
export const DIALOG_TITLE_HEADER_CLASS = cn(
  'shrink-0 bg-muted/30 px-6 py-3.5 pr-[4.75rem] sm:py-4 sm:pr-[5.75rem]',
  DIALOG_TITLE_BAR_BOTTOM_BORDER,
);

/** Footer strip above primary actions (top rule + surface; add horizontal padding via parent or `className`). */
export const DIALOG_FOOTER_ACTIONS_CLASS = cn('shrink-0 bg-muted/20 py-4', DIALOG_FOOTER_TOP_BORDER);

/**
 * Bordered icon tile for dialog / form headers (paired with title + description; sized to align with text block).
 * Pass Lucide at default stroke; `[&_svg]:size-5` inside `size-10` tile.
 */
export const DIALOG_TITLE_ICON_BOX_CLASS =
  'flex size-10 shrink-0 items-center justify-center border-2 border-primary/35 bg-primary/10 text-primary dark:border-primary/45 dark:bg-primary/15 [&_svg]:size-5';

const TITLE_MODE_CLOSE_BTN =
  'absolute right-4 top-3.5 z-30 flex size-9 shrink-0 items-center justify-center rounded-sm border-2 border-border bg-card text-muted-foreground shadow-[2px_2px_0_0_var(--border)] transition-colors hover:border-primary hover:text-foreground sm:right-6 sm:top-4';

const LEGACY_CLOSE_BTN =
  'absolute right-2 top-2 z-30 flex size-9 shrink-0 items-center justify-center rounded-sm border-2 border-border bg-card text-muted-foreground shadow-[2px_2px_0_0_var(--border)] transition-colors hover:border-primary hover:text-foreground';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** ID of the heading that labels the dialog (required when using `title`, or pass for legacy children that include the heading). */
  titleId?: string;
  /**
   * Primary title line (e.g. “Work experience”). When set, Dialog renders the standard header strip with
   * `description` under it, a light gray bottom border, and positions the close control flush to that row.
   */
  title?: ReactNode;
  /**
   * Icon inside the standard bordered tile next to `title` (settings / FormDialog pattern).
   * When omitted, `title` is rendered as-is (e.g. custom markup).
   */
  titleIcon?: ReactNode;
  /** Optional subtitle under the title (sentence style, like FormDialog). */
  description?: ReactNode;
  /** Optional class for the overlay/backdrop. Merged with default so backdrop always has bg and blocks clicks. */
  backdropClassName?: string;
  /** Optional class for the panel (the card). Merged with default so panel always has bg-card and pointer-events-auto. */
  panelClassName?: string;
  /** Optional class for the inner content wrapper (padding). */
  contentClassName?: string;
  /** Show the floating close (X). Set false when the panel lays out its own header (e.g. legacy FormDialog pattern). */
  showCloseButton?: boolean;
  /** Close when backdrop is clicked. Default true. */
  closeOnBackdropClick?: boolean;
  /** Close when Escape is pressed. Default true. */
  closeOnEscape?: boolean;
}

const defaultBackdropClass =
  'fixed inset-0 min-h-full min-w-full h-screen w-screen bg-black/60 backdrop-blur-[2px] pointer-events-auto';
const defaultPanelClass =
  'pointer-events-auto w-full max-w-md max-h-[90vh] overflow-y-auto border-2 border-border bg-card text-card-foreground shadow-[6px_6px_0px_0px_var(--border)]';

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
      <p className="max-w-2xl text-xs font-medium leading-relaxed text-muted-foreground">{description}</p>
    );

  if (titleIcon == null) {
    return (
      <div className="min-w-0 space-y-1">
        <h2 id={headingId} className="text-base font-black uppercase tracking-wide text-foreground">
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
        <h2 id={headingId} className="text-base font-black uppercase leading-tight tracking-wide text-foreground">
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
  contentClassName = 'relative p-6 sm:p-8',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: Readonly<DialogProps>) {
  const reactId = useId();
  const generatedTitleId = `dialog-title-${reactId.replaceAll(':', '')}`;
  /** Heading id for built-in title strip; falls back when `titleId` omitted. */
  const headingId = titleId ?? generatedTitleId;
  const useTitleHeader = title != null;
  const ariaLabelledBy = useTitleHeader ? headingId : titleId;

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, closeOnEscape]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev ?? '';
      };
    }
    document.body.style.overflow = '';
  }, [open]);

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
            style={{ zIndex: DIALOG_Z }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            aria-hidden
          />
          <div
            className="fixed inset-0 min-h-screen min-w-full flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: DIALOG_Z }}
          >
            <motion.div
              key="dialog-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                defaultPanelClass,
                useTitleHeader && 'flex flex-col overflow-hidden',
                panelClassName,
                'relative',
              )}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={ariaLabelledBy}
            >
              {useTitleHeader ? (
                <>
                  <header className={DIALOG_TITLE_HEADER_CLASS}>
                    <DialogTitleHeaderBody
                      headingId={headingId}
                      title={title}
                      titleIcon={titleIcon}
                      description={description}
                    />
                  </header>
                  {showCloseButton ? (
                    <button
                      type="button"
                      onClick={onClose}
                      className={TITLE_MODE_CLOSE_BTN}
                      aria-label="Close"
                    >
                      <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
                    </button>
                  ) : null}
                  <div className={cn('min-h-0 flex-1 flex flex-col', contentClassName)}>{children}</div>
                </>
              ) : (
                <>
                  {showCloseButton ? (
                    <button
                      type="button"
                      onClick={onClose}
                      className={LEGACY_CLOSE_BTN}
                      aria-label="Close"
                    >
                      <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
                    </button>
                  ) : null}
                  <div
                    className={cn(
                      'relative',
                      contentClassName,
                      showCloseButton && 'pt-11 px-11 sm:pt-12 sm:px-12',
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

  if (typeof document === 'undefined') return overlay;
  return createPortal(overlay, document.body);
}
