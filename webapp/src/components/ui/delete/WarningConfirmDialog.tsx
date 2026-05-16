'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

export interface WarningConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  confirming?: boolean;
  panelClassName?: string;
  children?: ReactNode;
}

/**
 * Same stacked layout as {@link DeleteConfirmDialog}: warning tile, centered title, full-width confirm.
 * Dismiss via backdrop or Escape — no separate cancel row.
 */
export function WarningConfirmDialog({
  open,
  onClose,
  titleId,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  confirming = false,
  panelClassName,
  children,
}: Readonly<WarningConfirmDialogProps>) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      showCloseButton={false}
      contentClassName="p-0"
      panelClassName={cn(
        'max-w-[min(100%,22rem)] overflow-hidden border-2 border-border bg-card shadow-[6px_6px_0_0_var(--border)]',
        panelClassName,
      )}
    >
      <div className="flex flex-col">
        <div className="border-b-2 border-amber-500/35 bg-gradient-to-b from-amber-500/[0.09] to-card px-6 pb-6 pt-8 text-center">
          <div
            className="mx-auto flex size-16 shrink-0 items-center justify-center border-2 border-amber-600 bg-amber-500/15 text-amber-700 shadow-[4px_4px_0_0_var(--border)] dark:border-amber-500 dark:text-amber-400"
            aria-hidden
          >
            <AlertTriangle className="size-8 stroke-[2.25]" />
          </div>
          <h2
            id={titleId}
            className="mt-5 font-mono text-base font-black uppercase leading-tight tracking-wide text-foreground"
          >
            {title}
          </h2>
          {description != null ? (
            <p className="mt-3 text-xs font-medium leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
          {children != null ? <div className="mt-4 text-left text-xs text-muted-foreground">{children}</div> : null}
        </div>
        <div className="border-t-2 border-border bg-muted/15 p-4">
          <button
            type="button"
            disabled={confirming}
            onClick={() => void onConfirm()}
            className="flex w-full min-h-12 items-center justify-center gap-2 border-2 border-border bg-primary px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0_0_var(--border)] transition-opacity hover:brightness-110 disabled:opacity-50"
          >
            <Check className="size-4 shrink-0 opacity-90" strokeWidth={2.5} aria-hidden />
            {confirming ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
