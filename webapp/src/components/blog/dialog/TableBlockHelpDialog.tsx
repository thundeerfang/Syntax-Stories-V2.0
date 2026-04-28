'use client';

import React from 'react';
import { BookOpen, Copy, Info, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DIALOG_FOOTER_ACTIONS_CLASS } from '@/components/ui/Dialog';
import { MAX_COLS, MAX_ROWS } from '@/components/blog/TableVisualGrid';
import { MAX_TABLE_CELL_CHARS, MAX_TABLE_PASTE_CHARS } from '@/lib/tableBlockLimits';
import { cn } from '@/lib/utils';

const EXAMPLE_TSV = `Feature\tOption A\tOption B
Speed\tFast\tVery fast
Cost\tLow\tHigher`;

const EXAMPLE_PIPE = `| Plan | Free | Pro |
|------|------|-----|
| Storage | 1 GB | 100 GB |
| API | Yes | Yes |`;

export interface TableBlockHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TableBlockHelpDialog({ open, onClose }: Readonly<TableBlockHelpDialogProps>) {
  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${label}`);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="table-block-help-title"
      titleIcon={<Table2 aria-hidden />}
      title="Table block"
      description="Paste, grid, and limits."
      panelClassName={cn('max-w-2xl max-h-[min(88vh,720px)] flex flex-col overflow-hidden')}
      contentClassName="flex min-h-0 flex-1 flex-col p-6 sm:p-8"
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
        <div className="flex gap-2 rounded-none border-2 border-border bg-muted/25 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p>
              Use <strong className="text-foreground">Paste &amp; table</strong> for TSV or pipe markdown, or{' '}
              <strong className="text-foreground">Visual grid</strong> to edit cells directly.
            </p>
            <p className="font-mono text-[10px] text-foreground/85">
              Limits: {MAX_ROWS}×{MAX_COLS} · paste {MAX_TABLE_PASTE_CHARS.toLocaleString()} chars ·{' '}
              {MAX_TABLE_CELL_CHARS.toLocaleString()} chars/cell
            </p>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden />
            Example formats
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-none border-2 border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground">TSV</span>
                <button
                  type="button"
                  onClick={() => void copyText(EXAMPLE_TSV, 'TSV example')}
                  className="inline-flex items-center gap-0.5 rounded-none border-2 border-border bg-card px-2 py-1 text-[9px] font-bold uppercase shadow-[2px_2px_0_0_var(--border)] hover:bg-muted/60 active:translate-x-px active:translate-y-px active:shadow-none"
                >
                  <Copy className="h-2.5 w-2.5" aria-hidden /> Copy
                </button>
              </div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-snug text-foreground">
                {EXAMPLE_TSV}
              </pre>
            </div>
            <div className="rounded-none border-2 border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground">Pipe</span>
                <button
                  type="button"
                  onClick={() => void copyText(EXAMPLE_PIPE, 'pipe example')}
                  className="inline-flex items-center gap-0.5 rounded-none border-2 border-border bg-card px-2 py-1 text-[9px] font-bold uppercase shadow-[2px_2px_0_0_var(--border)] hover:bg-muted/60 active:translate-x-px active:translate-y-px active:shadow-none"
                >
                  <Copy className="h-2.5 w-2.5" aria-hidden /> Copy
                </button>
              </div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-snug text-foreground">
                {EXAMPLE_PIPE}
              </pre>
            </div>
          </div>
        </section>
      </div>

      <footer className={cn(DIALOG_FOOTER_ACTIONS_CLASS, 'mt-5 space-y-0')}>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-none border-2 border-black bg-primary py-2.5 text-sm font-black uppercase text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:brightness-110 active:translate-x-px active:translate-y-px active:shadow-none"
        >
          Got it
        </button>
      </footer>
    </Dialog>
  );
}
