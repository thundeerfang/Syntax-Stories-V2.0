'use client';

import type { ReactNode } from 'react';
import { SkBar, SkBlock } from './primitives';
import { cn } from '@/lib/utils';

type DialogPanelSkeletonProps = {
  /** Shown above structural placeholders (e.g. OAuth status). */
  statusLine?: ReactNode;
  className?: string;
};

/**
 * Matches `FormDialog` / `Dialog` proportions: header tile + title, form rows, footer actions.
 */
export function DialogPanelSkeleton({ statusLine, className }: Readonly<DialogPanelSkeletonProps>) {
  return (
    <div
      className={cn(
        'flex w-full max-w-lg flex-col overflow-hidden rounded-none border-2 border-border bg-card shadow-[8px_8px_0_0_var(--border)]',
        className,
      )}
    >
      <header className="flex items-end gap-3 border-b-2 border-border bg-muted/20 px-4 py-3 sm:gap-4">
        <SkBlock className="size-11 shrink-0 animate-pulse border-2 border-border" />
        <div className="min-w-0 flex-1 space-y-2 pb-0.5">
          <SkBar className="h-4 max-w-[220px] w-[60%]" />
          <SkBar className="h-2 max-w-[280px] w-[75%]" />
        </div>
        <SkBlock className="size-8 shrink-0 animate-pulse" />
      </header>
      {statusLine != null && (
        <div className="border-b border-border/60 bg-background/80 px-4 py-2 text-center text-xs font-medium text-muted-foreground">
          {statusLine}
        </div>
      )}
      <div className="min-h-[max(12rem,28vh)] space-y-4 p-4 sm:p-5">
        <div className="space-y-2">
          <SkBar className="h-2 w-24" />
          <SkBlock className="h-10 w-full animate-pulse" />
        </div>
        <div className="space-y-2">
          <SkBar className="h-2 w-28" />
          <SkBlock className="h-10 w-full animate-pulse" />
        </div>
        <div className="space-y-2">
          <SkBar className="h-2 w-20" />
          <SkBlock className="h-24 w-full animate-pulse" />
        </div>
      </div>
      <footer className="flex justify-end gap-2 border-t-2 border-border bg-muted/10 px-4 py-3">
        <SkBlock className="h-9 w-20 animate-pulse" />
        <SkBlock className="h-9 w-24 animate-pulse" />
      </footer>
    </div>
  );
}
