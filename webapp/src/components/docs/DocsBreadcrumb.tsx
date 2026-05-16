'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/core/utils';

type ArticleCrumb = { slug: string; title: string; canonicalPath?: string };

function articleHref(a: ArticleCrumb): string {
  if (a.canonicalPath?.startsWith('/docs')) return a.canonicalPath;
  return `/docs/${a.slug}`;
}

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

function slugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/docs\/([^/]+)$/);
  return m?.[1] ?? null;
}

export function DocsBreadcrumb({ articles }: { articles: ArticleCrumb[] }) {
  const pathname = normalizePath(usePathname() ?? '');
  const isIndex = pathname === '/docs';
  const slug = slugFromPath(pathname);
  const match = slug
    ? articles.find((a) => a.slug === slug || normalizePath(articleHref(a)) === pathname)
    : null;
  const tail = isIndex ? 'Entry_Node' : match?.title ?? slug?.replace(/-/g, ' ') ?? 'Entry_Node';

  return (
    <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
      <Link
        href="/docs"
        className={cn('shrink-0 hover:text-primary', isIndex && 'text-foreground')}
      >
        Docs
      </Link>
      <ChevronRight size={10} className="shrink-0 opacity-60" aria-hidden />
      <span className="min-w-0 truncate text-foreground">{tail}</span>
    </div>
  );
}
