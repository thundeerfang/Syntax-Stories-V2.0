'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** ID of the element that labels the dialog (e.g. a heading). Used for aria-labelledby. */
  titleId?: string;
  /** Optional class for the overlay/backdrop. */
  backdropClassName?: string;
  /** Optional class for the panel (the card). */
  panelClassName?: string;
  /** Optional class for the inner content wrapper (padding). */
  contentClassName?: string;
  /** Show the close (X) button. Default true. */
  showCloseButton?: boolean;
  /** Close when backdrop is clicked. Default true. */
  closeOnBackdropClick?: boolean;
}

const defaultBackdropClass = 'fixed inset-0 z-50 min-h-full min-w-full h-screen w-screen bg-black/50';
const defaultPanelClass =
  'pointer-events-auto w-full max-w-md max-h-[90vh] overflow-y-auto border-2 border-border bg-card shadow-lg';

export function Dialog({
  open,
  onClose,
  children,
  titleId,
  backdropClassName = defaultBackdropClass,
  panelClassName = defaultPanelClass,
  contentClassName = 'relative p-6 sm:p-8',
  showCloseButton = true,
  closeOnBackdropClick = true,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={backdropClassName}
            onClick={closeOnBackdropClick ? onClose : undefined}
            aria-hidden
          />
          <div className="fixed inset-0 z-50 min-h-screen min-w-full flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="dialog-panel"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={panelClassName}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className={contentClassName}>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 cursor-pointer hover:opacity-80 transition-all"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
