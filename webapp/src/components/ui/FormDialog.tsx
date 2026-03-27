'use client';

import React from 'react';
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
}: Readonly<FormDialogProps>) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      panelClassName={cn('max-w-lg overflow-hidden flex flex-col max-h-[90vh]', panelClassName)}
      contentClassName={cn('p-0 flex flex-col max-h-[90vh]', contentClassName)}
    >
      {/* Header: title bar style */}
      <header className="flex-shrink-0 border-b-2 border-border bg-muted/30 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
          <h2 id={titleId} className="text-base font-black uppercase tracking-wide text-foreground">
            {title}
          </h2>
          {headerRight != null && <div className="flex items-center">{headerRight}</div>}
        </div>
        {subtitle != null && (
          <p className="mt-1 text-xs font-medium text-muted-foreground max-w-md">
            {subtitle}
          </p>
        )}
      </header>
      {/* Body: scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
        {children}
      </div>
      {/* Footer: actions bar */}
      {footer != null && (
        <footer className="flex-shrink-0 border-t-2 border-border bg-muted/20 px-6 py-4">
          {footer}
        </footer>
      )}
    </Dialog>
  );
}
