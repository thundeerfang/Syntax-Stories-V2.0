'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { highlightCodeToHtml } from '@/lib/codeHighlight';
import 'highlight.js/styles/github-dark.css';

export function BlogCodeBlockDisplay({
  code,
  languageHint,
  className,
}: Readonly<{
  code: string;
  languageHint?: string | null;
  className?: string;
}>) {
  const { language, html } = useMemo(
    () => highlightCodeToHtml(code, languageHint),
    [code, languageHint],
  );
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div
      className={cn(
        'mx-auto my-5 w-full max-w-4xl overflow-hidden border-2 border-border shadow-[6px_6px_0px_0px_var(--border)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-zinc-900 px-3 py-2 sm:px-4">
        <span className="min-w-0 truncate font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 sm:text-xs">
          {language}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex shrink-0 items-center gap-1.5 border-2 border-zinc-600 bg-zinc-800 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-zinc-100 transition-colors hover:border-primary hover:bg-zinc-700 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words bg-zinc-950 p-4 text-sm leading-relaxed sm:p-6">
        <code
          className="hljs !bg-transparent whitespace-pre-wrap font-mono text-sm"
          // highlight.js output is escaped; safe for innerHTML
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}
