'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { AlignLeft, Grid3x3, Info, Table2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { parseTableFromText } from '@/lib/tablePaste';
import {
  clampTableMatrix,
  MAX_TABLE_CELL_CHARS,
  MAX_TABLE_PASTE_CHARS,
} from '@/lib/tableBlockLimits';
import { TableBlockHelpDialog } from '@/components/blog/dialog/TableBlockHelpDialog';
import { MAX_COLS, MAX_ROWS, TableVisualGrid } from '@/components/blog/TableVisualGrid';
import type { TablePayload } from '@/types/blog';

type TableViewTab = 'paste' | 'grid';

export function TableBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: TablePayload;
  onUpdate: (p: TablePayload) => void;
  onRemove: () => void;
}>) {
  const rows = useMemo(() => {
    const base =
      Array.isArray(payload.rows) && payload.rows.length ? payload.rows : [['Column A', 'Column B'], ['', '']];
    return clampTableMatrix(base, MAX_ROWS, MAX_COLS, MAX_TABLE_CELL_CHARS);
  }, [payload.rows]);
  const [caption, setCaption] = useState(payload.caption ?? '');
  const [rawPaste, setRawPaste] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [tableTab, setTableTab] = useState<TableViewTab>('paste');

  const sync = useCallback(
    (nextRows: string[][], cap?: string) => {
      const c = (cap ?? caption).trim();
      onUpdate({
        caption: c || undefined,
        rows: clampTableMatrix(nextRows, MAX_ROWS, MAX_COLS, MAX_TABLE_CELL_CHARS),
      });
    },
    [caption, onUpdate],
  );

  const applyParsed = useCallback(
    (text: string) => {
      const sliced = text.slice(0, MAX_TABLE_PASTE_CHARS);
      if (sliced.length < text.length) {
        toast.message('Paste trimmed', {
          description: `Only the first ${MAX_TABLE_PASTE_CHARS.toLocaleString()} characters are used.`,
        });
      }
      const parsed = parseTableFromText(sliced);
      if (!parsed) {
        toast.error('Could not parse a table (need 2+ rows and tabs or | pipes).');
        return;
      }
      const clamped = clampTableMatrix(parsed, MAX_ROWS, MAX_COLS, MAX_TABLE_CELL_CHARS);
      const maxParsedCols = parsed.length ? Math.max(1, ...parsed.map((r) => r.length)) : 1;
      if (parsed.length > MAX_ROWS || maxParsedCols > MAX_COLS) {
        toast.message('Table size limited', {
          description: `Kept at most ${MAX_ROWS} rows and ${MAX_COLS} columns.`,
        });
      }
      sync(clamped);
      setRawPaste('');
      toast.success('Table updated from paste');
    },
    [sync],
  );

  const limitsSummary = `Up to ${MAX_ROWS} rows · ${MAX_COLS} columns · paste box ${MAX_TABLE_PASTE_CHARS.toLocaleString()} characters · ${MAX_TABLE_CELL_CHARS.toLocaleString()} characters per cell`;

  return (
    <div className="group space-y-3 rounded-md border-0 bg-muted/10 p-3 ring-1 ring-border/35">
      <TableBlockHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <Table2 className="h-3.5 w-3.5" /> Table
        </span>
        <span className="flex items-center gap-0.5">
          <button
            type="button"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary"
            onClick={() => setHelpOpen(true)}
            aria-label="Table block help"
            title="Help"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-destructive opacity-0 transition-opacity hover:text-destructive/80 group-hover:opacity-100"
            onClick={onRemove}
            aria-label="Remove table block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <input
        type="text"
        value={caption}
        onChange={(e) => {
          const v = e.target.value;
          setCaption(v);
          onUpdate({
            rows: clampTableMatrix(rows, MAX_ROWS, MAX_COLS, MAX_TABLE_CELL_CHARS),
            caption: v.trim() || undefined,
          });
        }}
        placeholder="Optional caption (e.g. Core Differences)"
        className="w-full border-0 border-b border-border/40 bg-transparent px-0 py-1.5 font-mono text-xs focus:border-primary/50 focus:outline-none"
      />

      <div
        role="tablist"
        aria-label="Table editing mode"
        className="flex w-full gap-0 border-0 border-b border-border/40 bg-transparent p-0"
      >
        <button
          type="button"
          role="tab"
          id="table-tab-paste"
          aria-selected={tableTab === 'paste'}
          aria-controls="table-panel-paste"
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-none border-0 border-b-2 px-2 py-2 text-[10px] font-black uppercase tracking-wide transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0',
            tableTab === 'paste'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground',
          )}
          onClick={() => setTableTab('paste')}
        >
          <AlignLeft className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          Paste & table
        </button>
        <button
          type="button"
          role="tab"
          id="table-tab-grid"
          aria-selected={tableTab === 'grid'}
          aria-controls="table-panel-grid"
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-none border-0 border-b-2 px-2 py-2 text-[10px] font-black uppercase tracking-wide transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0',
            tableTab === 'grid'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground',
          )}
          onClick={() => setTableTab('grid')}
        >
          <Grid3x3 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          Visual grid
        </button>
      </div>

      <p className="rounded-none border-0 bg-muted/20 px-2 py-1.5 font-mono text-[9px] leading-snug text-muted-foreground">
        {limitsSummary}
      </p>

      {tableTab === 'paste' ? (
        <div id="table-panel-paste" role="tabpanel" aria-labelledby="table-tab-paste" className="space-y-2">
          <textarea
            value={rawPaste}
            maxLength={MAX_TABLE_PASTE_CHARS}
            onChange={(e) => setRawPaste(e.target.value.slice(0, MAX_TABLE_PASTE_CHARS))}
            onPaste={(e) => {
              const t = e.clipboardData.getData('text/plain').slice(0, MAX_TABLE_PASTE_CHARS);
              const parsed = parseTableFromText(t);
              if (parsed) {
                e.preventDefault();
                applyParsed(t);
              }
            }}
            placeholder={`Feature\tSupabase\tConvex\nDatabase\tPostgreSQL\tCustom DB`}
            spellCheck={false}
            className={cn(
              'min-h-[100px] w-full resize-y border-0 bg-muted/25 p-2 font-mono text-[11px] leading-relaxed ring-1 ring-border/35',
              'text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/35',
            )}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-none border-2 border-black bg-primary px-3 py-2 font-mono text-[10px] font-black uppercase text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:brightness-110 active:translate-x-px active:translate-y-px active:shadow-none"
              onClick={() => applyParsed(rawPaste)}
            >
              Apply paste
            </button>
            <span className="font-mono text-[9px] text-muted-foreground">
              {rawPaste.length.toLocaleString()} / {MAX_TABLE_PASTE_CHARS.toLocaleString()}
            </span>
          </div>
          <div className="overflow-hidden rounded-md border-0 bg-muted/15 ring-1 ring-border/30">
            <div className="border-0 border-b border-border/35 bg-muted/25 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Current table
            </div>
            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[280px] border-collapse text-left text-[11px]">
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={`r-${ri}`} className="border-b border-border last:border-b-0">
                      {r.map((c, ci) => (
                        <td key={`c-${ri}-${ci}`} className="border-r border-border px-2 py-1 font-mono last:border-r-0">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div id="table-panel-grid" role="tabpanel" aria-labelledby="table-tab-grid" className="space-y-2">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Edit cells below. Size controls change the grid; changes apply to the block immediately. Use{' '}
            <strong className="text-foreground">Paste & table</strong> for TSV or pipe tables.
          </p>
          <div className="overflow-hidden rounded-md border-0 bg-muted/15 p-2 ring-1 ring-border/30">
            <TableVisualGrid
              value={rows}
              onChange={(next) => sync(next)}
              scrollClassName="max-h-[min(52vh,360px)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
