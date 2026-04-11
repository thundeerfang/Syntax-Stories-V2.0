'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function MermaidBlockDisplay({
  source,
  className,
}: Readonly<{
  source: string;
  className?: string;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const toastedForSourceRef = useRef<string | null>(null);
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const trimmed = source.trim();
    if (!trimmed) {
      el.innerHTML = '';
      setErr(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        const id = `mermaid-${uid}-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, trimmed);
        if (cancelled) return;
        el.innerHTML = svg;
        setErr(null);
      } catch (e) {
        if (cancelled) return;
        const raw = e instanceof Error ? e.message : 'Invalid diagram';
        const detail =
          raw.length > 160
            ? `${raw.slice(0, 160)}…`
            : `${raw} — Quote labels that contain spaces in the editor.`;
        setErr(detail);
        el.innerHTML = '';
        if (toastedForSourceRef.current !== trimmed) {
          toastedForSourceRef.current = trimmed;
          toast.error('Could not render a Mermaid diagram on this page.', { description: detail });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, uid]);

  if (!source.trim()) return null;

  return (
    <figure
      className={cn(
        'mx-auto my-6 w-full max-w-4xl overflow-x-auto rounded-none border-2 border-border bg-card p-4 shadow-[6px_6px_0_0_var(--border)]',
        className,
      )}
    >
      <figcaption className="mb-3 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Diagram
      </figcaption>
      {err ? (
        <div className="space-y-2">
          <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Unable to render Mermaid
          </p>
          <details className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            <summary className="cursor-pointer select-none text-foreground/90">Details</summary>
            <p className="mt-2 text-destructive/90">{err}</p>
          </details>
        </div>
      ) : (
        <div ref={ref} className="mermaid-render flex justify-center [&_svg]:max-h-[min(70vh,480px)]" />
      )}
    </figure>
  );
}
