'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** z-index for dialog overlay so it appears above navbar (z-40) and other layout. */
const DIALOG_Z = 100;

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** ID of the element that labels the dialog (e.g. a heading). Used for aria-labelledby. */
  titleId?: string;
  /** Optional class for the overlay/backdrop. Merged with default so backdrop always has bg and blocks clicks. */
  backdropClassName?: string;
  /** Optional class for the panel (the card). Merged with default so panel always has bg-card and pointer-events-auto. */
  panelClassName?: string;
  /** Optional class for the inner content wrapper (padding). */
  contentClassName?: string;
  /** Show the floating close (X) and reserve pt-11/pr-11 on the content wrapper. Set false when the panel lays out its own header (e.g. FormDialog). */
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

export function Dialog({
  open,
  onClose,
  children,
  titleId,
  backdropClassName,
  panelClassName,
  contentClassName = 'relative p-6 sm:p-8',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: Readonly<DialogProps>) {
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
              className={cn(defaultPanelClass, panelClassName, 'relative')}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-2 top-2 z-30 flex size-9 shrink-0 items-center justify-center rounded-sm border-2 border-border bg-card text-muted-foreground shadow-[2px_2px_0_0_var(--border)] transition-colors hover:text-foreground hover:border-primary"
                  aria-label="Close"
                >
                  <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
                </button>
              )}
              <div
                className={cn(
                  'relative',
                  contentClassName,
                  showCloseButton && 'pt-11 pr-11 sm:pt-12 sm:pr-12'
                )}
              >
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return overlay;
  return createPortal(overlay, document.body);
}
