'use client';

import React, { useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAX_TABLE_CELL_CHARS, truncateCell } from '@/lib/tableBlockLimits';

export const MAX_COLS = 12;
export const MAX_ROWS = 24;
export const MIN_COLS = 1;
export const MIN_ROWS = 1;

export function rectangularize(rows: string[][]): string[][] {
  if (!rows.length) return [['']];
  const w = Math.max(1, ...rows.map((r) => r.length));
  return rows.map((r) => {
    const v = [...r];
    while (v.length < w) v.push('');
    return v.slice(0, w);
  });
}

export function resizeGrid(rows: string[][], rowCount: number, colCount: number): string[][] {
  const base = rectangularize(rows);
  const out: string[][] = [];
  for (let i = 0; i < rowCount; i++) {
    const src = base[i] ?? [];
    const row: string[] = [];
    for (let j = 0; j < colCount; j++) {
      row.push(src[j] ?? '');
    }
    out.push(row);
  }
  return out;
}

export interface TableVisualGridProps {
  value: string[][];
  onChange: (next: string[][]) => void;
  className?: string;
  toolbarClassName?: string;
  scrollClassName?: string;
}

export function TableVisualGrid({
  value,
  onChange,
  className,
  toolbarClassName,
  scrollClassName,
}: Readonly<TableVisualGridProps>) {
  const grid = rectangularize(value);
  const colCount = grid[0]?.length ?? 1;
  const rowCount = grid.length;

  const setDims = useCallback(
    (rows: number, cols: number) => {
      const r = Math.min(MAX_ROWS, Math.max(MIN_ROWS, rows));
      const c = Math.min(MAX_COLS, Math.max(MIN_COLS, cols));
      onChange(resizeGrid(grid, r, c));
    },
    [grid, onChange],
  );

  const bumpCols = (delta: number) => setDims(rowCount, colCount + delta);
  const bumpRows = (delta: number) => setDims(rowCount + delta, colCount);

  const setCell = useCallback(
    (ri: number, ci: number, cellValue: string) => {
      const next = grid.map((row) => [...row]);
      if (!next[ri]) return;
      const row = [...next[ri]];
      row[ci] = truncateCell(cellValue, MAX_TABLE_CELL_CHARS);
      next[ri] = row;
      onChange(next);
    },
    [grid, onChange],
  );

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-3', className)}>
      <div className={cn('flex flex-wrap items-center gap-3 text-[10px]', toolbarClassName)}>
        <span className="font-black uppercase text-muted-foreground">Size</span>
        <div className="flex items-center gap-1 border-2 border-border bg-muted/20 px-1 py-0.5">
          <span className="px-1 font-mono text-muted-foreground">Cols</span>
          <button
            type="button"
            aria-label="Remove column"
            className="p-1 hover:bg-card disabled:opacity-40"
            disabled={colCount <= MIN_COLS}
            onClick={() => bumpCols(-1)}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[1.5rem] text-center font-mono font-bold">{colCount}</span>
          <button
            type="button"
            aria-label="Add column"
            className="p-1 hover:bg-card disabled:opacity-40"
            disabled={colCount >= MAX_COLS}
            onClick={() => bumpCols(1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1 border-2 border-border bg-muted/20 px-1 py-0.5">
          <span className="px-1 font-mono text-muted-foreground">Rows</span>
          <button
            type="button"
            aria-label="Remove row"
            className="p-1 hover:bg-card disabled:opacity-40"
            disabled={rowCount <= MIN_ROWS}
            onClick={() => bumpRows(-1)}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[1.5rem] text-center font-mono font-bold">{rowCount}</span>
          <button
            type="button"
            aria-label="Add row"
            className="p-1 hover:bg-card disabled:opacity-40"
            disabled={rowCount >= MAX_ROWS}
            onClick={() => bumpRows(1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          'min-h-0 flex-1 overflow-auto border-2 border-border bg-background',
          scrollClassName,
        )}
      >
        <table className="w-full min-w-[240px] border-collapse text-left text-[11px]">
          <tbody>
            {grid.map((r, ri) => (
              <tr key={`vg-r-${ri}`} className="border-b border-border last:border-b-0">
                {r.map((cell, ci) => (
                  <td key={`vg-c-${ri}-${ci}`} className="border-r border-border p-0 last:border-r-0 align-top">
                    <input
                      type="text"
                      value={cell}
                      maxLength={MAX_TABLE_CELL_CHARS}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      className="h-full min-h-[2rem] w-full min-w-[4.5rem] border-0 bg-transparent px-2 py-1.5 font-mono text-[11px] focus:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40"
                      aria-label={`Cell row ${ri + 1} column ${ci + 1}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
