'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SHELL_CONTENT_MEASURE_CLASS, SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';

/** Matches `PublicBlogPostPage` loading UI — use in route `loading.tsx` + client fetch state. */
export function BlogPostPageSkeletonInner() {
  return (
    <div className="public-blog-post-page flex min-h-screen flex-col bg-background text-foreground">
      <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'relative flex-1 !overflow-visible py-6 md:py-10 xl:py-6')}>
        <div className="w-full border-2 border-border bg-transparent">
          <div className="px-3 py-6 sm:px-4 lg:px-5 md:py-10">
            <div className="mb-8 flex flex-wrap gap-3">
              <div className="h-8 w-40 animate-pulse bg-muted sm:h-9" aria-hidden />
              <div className="h-8 w-32 animate-pulse bg-muted/70 sm:h-9" aria-hidden />
            </div>
            <div className="mb-10 space-y-3 md:space-y-4">
              <div className="h-10 w-full max-w-4xl animate-pulse bg-muted md:h-14" aria-hidden />
              <div className="h-10 w-[92%] max-w-3xl animate-pulse bg-muted md:h-14" aria-hidden />
              <div className="h-10 w-[64%] max-w-2xl animate-pulse bg-muted md:h-14" aria-hidden />
            </div>
            <div className="border-l-4 border-primary/25 bg-muted/10 p-6 md:p-8">
              <div className="mb-4 h-3 w-36 animate-pulse bg-muted/80" aria-hidden />
              <div className="space-y-2">
                <div className="h-2.5 w-full animate-pulse bg-muted" aria-hidden />
                <div className="h-2.5 w-full animate-pulse bg-muted" aria-hidden />
                <div className="h-2.5 w-[78%] animate-pulse bg-muted" aria-hidden />
              </div>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
              Initializing_Stream…
            </div>
          </div>
          <div className="px-3 py-6 sm:px-4 lg:px-5 md:py-10">
            <div className={cn('space-y-3', SHELL_CONTENT_MEASURE_CLASS)}>
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={`blog-post-sk-${i}`}
                  className="h-2.5 animate-pulse bg-muted"
                  style={{ width: i % 4 === 0 ? '100%' : i % 4 === 1 ? '96%' : i % 4 === 2 ? '88%' : '72%' }}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
