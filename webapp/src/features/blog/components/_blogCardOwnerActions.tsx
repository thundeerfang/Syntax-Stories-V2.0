'use client';

import Link from 'next/link';
import { ArchiveRestore, Pencil, Skull, Trash2 } from 'lucide-react';
import { cn } from '@/lib/core/utils';

export type BlogCardOwnerActions =
  | { mode: 'published'; viewHref: string; onEdit: () => void; onDelete: () => void }
  | { mode: 'draft'; onEdit: () => void; onDelete: () => void }
  | {
      mode: 'deleted';
      restoreBusy?: boolean;
      deletedMeta: string;
      onRestore: () => void;
      onPurge: () => void;
    };

const FOOTER_BTN =
  'flex flex-1 items-center justify-center gap-1 border-2 border-border bg-muted/40 py-2.5 font-mono text-[9px] font-black uppercase tracking-wide text-foreground transition-[background-color,border-color] duration-300 ease-out hover:bg-muted/70 dark:border-border/50 dark:bg-white/10 dark:hover:bg-white/18';

const DANGER_BTN =
  'flex flex-1 items-center justify-center gap-1 border-2 border-destructive/60 bg-destructive/20 py-2.5 font-mono text-[9px] font-black uppercase tracking-wide text-destructive transition-[background-color,border-color] duration-300 ease-out hover:bg-destructive/35 dark:bg-red-500/12 dark:text-red-300 dark:hover:bg-red-500/22';

export function BlogCardOwnerActionsOverlay({
  actions,
}: Readonly<{ actions: BlogCardOwnerActions }>) {
  const mode = actions.mode;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-20 flex flex-col justify-end',
        'opacity-0',
        'transform-gpu transition-opacity duration-300 ease-out',
        'motion-reduce:transition-none motion-reduce:duration-0',
        'group-hover/card:pointer-events-auto group-hover/card:opacity-100',
        'group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100'
      )}
    >
      <div
        className="min-h-0 flex-1 bg-gradient-to-t from-muted/75 via-muted/30 to-transparent dark:from-black/55 dark:via-black/25 dark:to-transparent"
        aria-hidden
      />
      <div
        className={cn(
          'relative z-10 flex w-full flex-row items-stretch gap-2 border-t-2 border-border bg-card/95 p-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-border/40 dark:bg-black/88 dark:shadow-none',
          'translate-y-2 transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
          'motion-reduce:translate-y-0 motion-reduce:transition-none',
          'group-hover/card:translate-y-0 group-focus-within/card:translate-y-0'
        )}
      >
        {mode === 'published' ? (
          <Link
            href={actions.viewHref}
            target="_blank"
            rel="noopener noreferrer"
            className={FOOTER_BTN}
          >
            View
          </Link>
        ) : null}
        {mode === 'published' || mode === 'draft' ? (
          <>
            <button type="button" onClick={actions.onEdit} className={FOOTER_BTN}>
              <Pencil className="size-3" aria-hidden />
              Edit
            </button>
            <button
              type="button"
              onClick={actions.onDelete}
              className={DANGER_BTN}
              aria-label="Move post to trash"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete
            </button>
          </>
        ) : null}
        {mode === 'deleted' ? (
          <>
            <button
              type="button"
              disabled={actions.restoreBusy}
              onClick={actions.onRestore}
              className={FOOTER_BTN}
            >
              <ArchiveRestore className="size-3.5" aria-hidden />
              {actions.restoreBusy ? '…' : 'Restore'}
            </button>
            <button type="button" onClick={actions.onPurge} className={DANGER_BTN}>
              <Skull className="size-3.5" aria-hidden />
              Delete forever
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
