'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

function normalizeDomain(domain: string | undefined): string {
  if (!domain?.trim()) return '';
  const t = domain.trim();
  /** Keep explicit http(s) so previews match the link the user saved. */
  if (/^https?:\/\//i.test(t)) {
    return t.replace(/\/$/, '');
  }
  const d = t.replace(/^\/+/, '').replace(/\/$/, '');
  return d ? `https://${d}` : '';
}

const MICROLINK_API = 'https://api.microlink.io';

export interface LinkPreviewCardContentProps {
  domain: string;
  title?: string;
}

/** Link preview card: header opens in new tab; body shows screenshot preview via Microlink API. */
export function LinkPreviewCardContent({ domain, title }: Readonly<LinkPreviewCardContentProps>) {
  const url = normalizeDomain(domain);
  const displayDomain = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      setFailed(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setFaviconError(false);
    setScreenshotUrl(null);
    const apiUrl = `${MICROLINK_API}/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`;
    fetch(apiUrl, { signal: AbortSignal.timeout(7000) })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const src = data?.data?.screenshot?.url;
        if (src && typeof src === 'string') setScreenshotUrl(src);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="p-0 overflow-hidden">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        {faviconError || !displayDomain ? (
          <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <img
            src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(displayDomain)}&sz=32`}
            alt=""
            className="size-4 shrink-0"
            onError={() => setFaviconError(true)}
          />
        )}
        <div className="min-w-0 flex-1">
          {title && <p className="text-xs font-black truncate leading-tight">{title}</p>}
          <p className={title ? 'text-[10px] font-bold text-muted-foreground truncate leading-tight' : 'text-xs font-bold truncate leading-tight'}>
            {displayDomain}
          </p>
        </div>
        <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
      </a>
      <div className="w-full h-[140px] bg-muted/30 relative overflow-hidden flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground uppercase">Loading preview…</span>
          </div>
        )}
        {!loading && screenshotUrl && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 block"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={screenshotUrl}
              alt={`Preview of ${displayDomain}`}
              className="w-full h-full object-cover object-top"
            />
          </a>
        )}
        {!loading && failed && (
          <div className="p-4 flex flex-col items-center justify-center gap-2 absolute inset-0 bg-muted/20">
            <p className="text-[10px] text-muted-foreground text-center">Preview unavailable</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="size-3.5" />
              Open in new tab
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
