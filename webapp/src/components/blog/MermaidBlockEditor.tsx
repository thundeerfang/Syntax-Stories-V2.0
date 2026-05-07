'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Network, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateMermaidSource } from '@/lib/mermaidValidate';
import type { MermaidDiagramPayload } from '@/types/blog';

const DEFAULT = `graph TD
    A[Client App] --> B[API]
    B --> C[Database]`;

export function MermaidBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: MermaidDiagramPayload;
  onUpdate: (p: MermaidDiagramPayload) => void;
  onRemove: () => void;
}>) {
  const initial = typeof payload.source === 'string' && payload.source.trim() ? payload.source : DEFAULT;
  const [source, setSource] = useState(initial);
  const [parseHint, setParseHint] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (next: string) => {
      setSource(next);
      onUpdate({ source: next });
    },
    [onUpdate],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const t = source.trim();
    if (!t) {
      setParseHint(null);
      return;
    }
    timerRef.current = setTimeout(() => {
      void (async () => {
        const res = await validateMermaidSource(source);
        setParseHint(res.ok ? null : res.message);
      })();
    }, 450);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [source]);

  return (
    <div className="group space-y-2 rounded-md border-0 bg-muted/10 p-3 ring-1 ring-border/35">
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <Network className="h-3.5 w-3.5" /> Mermaid diagram
        </span>
        <button
          type="button"
          className="rounded-none p-1 text-destructive opacity-0 transition-opacity hover:text-destructive/80 group-hover:opacity-100"
          onClick={onRemove}
          aria-label="Remove diagram"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        value={source}
        onChange={(e) => persist(e.target.value)}
        spellCheck={false}
        placeholder="graph TD ..."
        className={cn(
          'min-h-[160px] w-full resize-y rounded-md border-0 bg-muted/25 p-3 font-mono text-[11px] leading-relaxed ring-1 ring-border/40',
          'text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/35',
          parseHint ? 'ring-destructive/50' : '',
        )}
      />
      {parseHint ? (
        <p className="border border-destructive/40 bg-destructive/5 px-2 py-1.5 font-mono text-[10px] leading-snug text-destructive">
          {parseHint}
        </p>
      ) : null}
      <p className="text-[10px] text-muted-foreground">
        Validated before publish. Use quotes for labels with spaces:{' '}
        <code className="border border-border px-1">B[&quot;Supabase API&quot;]</code>. One statement per line after{' '}
        <code className="border border-border px-1">graph TD</code>.
      </p>
    </div>
  );
}
