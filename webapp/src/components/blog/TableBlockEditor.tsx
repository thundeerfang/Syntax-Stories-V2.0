'use client';

import React, { useCallback, useState } from 'react';
import { Table2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { parseTableFromText } from '@/lib/tablePaste';
import type { TablePayload } from '@/types/blog';

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
  const rows = Array.isArray(payload.rows) && payload.rows.length ? payload.rows : [['Column A', 'Column B'], ['', '']];
  const [caption, setCaption] = useState(payload.caption ?? '');
  const [rawPaste, setRawPaste] = useState('');

  const sync = useCallback(
    (nextRows: string[][], cap?: string) => {
      const c = (cap ?? caption).trim();
      onUpdate({
        caption: c || undefined,
        rows: nextRows,
      });
    },
    [caption, onUpdate],
  );

  const applyParsed = useCallback(
    (text: string) => {
      const parsed = parseTableFromText(text);
      if (!parsed) {
        toast.error('Could not parse a table (need 2+ rows and tabs or | pipes).');
        return;
      }
      sync(parsed);
      setRawPaste('');
      toast.success('Table updated from paste');
    },
    [sync],
  );

  return (
    <div className="group space-y-2 rounded-md border-2 border-border bg-card p-3">
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <Table2 className="h-3.5 w-3.5" /> Table
        </span>
        <button
          type="button"
          className="rounded p-1 text-destructive opacity-0 transition-opacity hover:text-destructive/80 group-hover:opacity-100"
          onClick={onRemove}
          aria-label="Remove table block"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        type="text"
        value={caption}
        onChange={(e) => {
          const v = e.target.value;
          setCaption(v);
          onUpdate({ rows, caption: v.trim() || undefined });
        }}
        placeholder="Optional caption (e.g. Core Differences)"
        className="w-full border-2 border-border bg-background px-2 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
      />
      <p className="text-[10px] text-muted-foreground">
        Paste <strong>tab-separated</strong> or <strong>markdown pipe</strong> rows below, then Apply — or paste directly
        into the box with Ctrl+V.
      </p>
      <textarea
        value={rawPaste}
        onChange={(e) => setRawPaste(e.target.value)}
        onPaste={(e) => {
          const t = e.clipboardData.getData('text/plain');
          const parsed = parseTableFromText(t);
          if (parsed) {
            e.preventDefault();
            applyParsed(t);
          }
        }}
        placeholder={`Feature\tSupabase\tConvex\nDatabase\tPostgreSQL\tCustom DB`}
        spellCheck={false}
        className={cn(
          'min-h-[100px] w-full resize-y border-2 border-border bg-muted/20 p-2 font-mono text-[11px] leading-relaxed',
          'text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none',
        )}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="border-2 border-primary bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase text-primary-foreground hover:brightness-110"
          onClick={() => applyParsed(rawPaste)}
        >
          Apply paste
        </button>
      </div>
      <div className="overflow-x-auto border border-border bg-background">
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
  );
}
