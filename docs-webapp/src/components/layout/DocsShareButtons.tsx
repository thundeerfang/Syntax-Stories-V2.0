'use client';

import { useCallback, useState } from 'react';
import { Check, Link2, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { RETRO_BTN_GHOST } from '@/lib/retroUi';

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function DocsShareButtons() {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = typeof document !== 'undefined' ? document.title : 'Syntax Stories Docs';

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [shareUrl]);

  const twitterHref = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={twitterHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className={cn(RETRO_BTN_GHOST, 'h-9 w-9')}
      >
        <XIcon className="h-4 w-4" />
      </a>
      <a
        href={linkedInHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className={cn(RETRO_BTN_GHOST, 'h-9 w-9')}
      >
        <Linkedin className="h-4 w-4" />
      </a>
      <button
        type="button"
        onClick={() => void copyLink()}
        aria-label={copied ? 'Link copied' : 'Copy page link'}
        className={cn(RETRO_BTN_GHOST, 'h-9 w-9')}
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
