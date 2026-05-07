'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ChevronRight, FileText, Layout, Library, Search, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DocsSidebarArticle = { slug: string; title: string; canonicalPath?: string };

/** Small status dot — blink via Tailwind only (no global CSS). */
function BlinkDot() {
  return (
    <span
      className="size-1.5 shrink-0 rounded-full bg-primary motion-safe:animate-pulse motion-reduce:animate-none"
      aria-hidden
    />
  );
}

function articleHref(a: DocsSidebarArticle): string {
  if (a.canonicalPath?.startsWith('/docs')) return a.canonicalPath;
  return `/docs/${a.slug}`;
}

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

export function DocsSidebarNav({ articles }: { articles: DocsSidebarArticle[] }) {
  const pathname = normalizePath(usePathname() ?? '');
  const overviewActive = pathname === '/docs';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b-4 border-border bg-muted/30 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center border-2 border-border bg-card shadow-[2px_2px_0_0_var(--border)]">
            <BookOpen className="size-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Docs</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Library className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                Public registry
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 py-3">
        <div
          className="flex items-center gap-2 border-2 border-border bg-background px-3 py-1.5 opacity-60"
          aria-hidden
        >
          <Search size={12} className="shrink-0" />
          <span className="flex-1 text-[10px] font-bold uppercase tracking-widest">Search index</span>
          <span className="flex items-center gap-0.5 border border-border px-1 font-mono text-[8px]">
            <Command size={8} />K
          </span>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 flex items-center gap-2 px-2">
          <BlinkDot />
          <Layout size={12} className="shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 truncate font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Main_Index
          </span>
        </div>

        <ul className="space-y-1">
          <li>
            <Link
              href="/docs"
              className={cn(
                'flex items-center gap-3 border-4 border-transparent px-3 py-2 text-[11px] font-bold uppercase tracking-tight text-muted-foreground',
                'hover:border-border hover:bg-muted/40 hover:text-foreground',
                overviewActive &&
                  'border-border bg-card text-foreground shadow-[4px_4px_0_0_var(--border)] hover:border-border'
              )}
            >
              <FileText size={12} className="shrink-0 text-primary" />
              <span className="truncate">00 // Overview</span>
            </Link>
          </li>

          <div className="my-4 border-t-2 border-dashed border-border" />

          <p className="mb-2 px-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
            Articles
          </p>

          {articles.map((a, i) => {
            const href = articleHref(a);
            const active = normalizePath(pathname) === normalizePath(href);
            return (
              <li key={a.slug}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 border-4 border-transparent px-3 py-2 text-[11px] font-bold uppercase tracking-tight text-muted-foreground',
                    'hover:border-border hover:bg-muted/40 hover:text-foreground',
                    active &&
                      'border-border bg-card text-foreground shadow-[4px_4px_0_0_var(--border)] hover:border-border'
                  )}
                >
                  <FileText size={12} className="shrink-0 text-primary" />
                  <span className="truncate">
                    {String(i + 1).padStart(2, '0')}
                    {' · '}
                    {a.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <footer className="mt-auto shrink-0 border-t-4 border-border bg-muted/25 p-4">
        <div className="mb-2 flex items-center gap-2">
          <BlinkDot />
          <p className="font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Need assistance?
          </p>
        </div>
        <Link
          href="/help"
          className="flex items-center justify-between text-[10px] font-black uppercase text-primary underline-offset-4 hover:underline"
        >
          Help center
          <ChevronRight size={14} aria-hidden />
        </Link>
      </footer>
    </div>
  );
}
