'use client';

import { Copy, ExternalLink } from 'lucide-react';
import { useCallback, useState } from 'react';
import { webappUrl } from '@/lib/config/site';

type DocsArticleCalloutProps = {
  title: string;
};

/** Purple callout strip — mirrors daily.dev “summary / copy page” row. */
export function DocsArticleCallout({ title }: DocsArticleCalloutProps) {
  const [copied, setCopied] = useState(false);
  const helpUrl = `${webappUrl()}/help`;

  const copyPage = useCallback(async () => {
    const md = `# ${title}\n\n${window.location.href}`;
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [title]);

  return (
    <div className="mb-8 flex flex-col gap-3 border-2 border-primary/30 bg-primary/10 p-4 shadow sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-foreground">
        Need more help?{' '}
        <a
          href={helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline"
        >
          Visit the help center
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </p>
      <button
        type="button"
        onClick={() => void copyPage()}
        className="inline-flex shrink-0 items-center gap-2 border-2 border-border bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow transition-all hover:bg-muted active:translate-x-px active:translate-y-px active:shadow-none"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden />
        {copied ? 'Copied!' : 'Copy page'}
      </button>
    </div>
  );
}
