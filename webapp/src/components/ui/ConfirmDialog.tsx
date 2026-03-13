'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from './Dialog';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Short description or message. */
  message: React.ReactNode;
  /** Label for the confirm button (e.g. "Remove", "Delete"). */
  confirmLabel: string;
  onConfirm: () => void;
  /** If true, confirm button uses destructive (red) styling. Default true for delete/remove. */
  variant?: 'danger' | 'default';
  /** While true, confirm button is disabled (e.g. while submitting). */
  loading?: boolean;
}

/**
 * Common confirmation dialog for destructive or important actions (e.g. Remove entry, Delete).
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  onConfirm,
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="confirm-dialog-title"
      panelClassName="max-w-sm"
      contentClassName="p-6"
      showCloseButton={true}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          {variant === 'danger' && (
            <span className="flex size-10 shrink-0 items-center justify-center border-2 border-destructive/50 bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-base font-black uppercase tracking-wide">
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 border-2 border-border bg-background font-bold text-xs uppercase tracking-wide shadow-[2px_2px_0px_0px_var(--border)] hover:bg-muted/50 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'px-5 py-2.5 border-2 font-black text-xs uppercase tracking-wide shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50',
              variant === 'danger'
                ? 'border-destructive bg-destructive text-destructive-foreground hover:opacity-90'
                : 'border-primary bg-primary text-primary-foreground hover:opacity-90'
            )}
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
