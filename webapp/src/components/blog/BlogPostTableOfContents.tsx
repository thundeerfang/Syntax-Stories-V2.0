'use client';

import { ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlogHeadingTocItem } from '@/lib/extractBlogHeadingToc';

const RAIL_CARD =
  'border-2 border-border bg-card p-4 shadow-[4px_4px_0_0_var(--border)]';

export function BlogPostTableOfContents({
  items,
  className,
}: Readonly<{
  items: BlogHeadingTocItem[];
  className?: string;
}>) {
  if (items.length === 0) return null;

  const scrollTo = (anchorId: string) => {
    const el = document.getElementById(anchorId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      className={cn('flex h-full min-h-0 flex-col space-y-3', className)}
      aria-label="On this page"
    >
      <div className={cn(RAIL_CARD, 'flex min-h-0 flex-1 flex-col overflow-hidden')}>
        <div className="mb-3 flex shrink-0 items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <ListTree className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
          Index
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 ss-scrollbar-hide">
          <ol className="m-0 list-none space-y-1.5 p-0">
            {items.map((item) => (
              <li key={item.anchorId}>
                <button
                  type="button"
                  onClick={() => scrollTo(item.anchorId)}
                  className={cn(
                    'w-full text-left font-sans text-xs font-semibold leading-snug text-foreground transition-colors',
                    'hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                    item.level === 3 ? 'pl-3 text-[11px] text-muted-foreground hover:text-primary' : '',
                  )}
                >
                  {item.text}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </nav>
  );
}
