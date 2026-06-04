'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { articleHref } from '@/lib/config/site';
import { useDocsLayout } from './DocsLayoutContext';

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

export function DocsBreadcrumbs() {
  const pathname = normalizePath(usePathname() ?? '/');
  const { filteredArticles } = useDocsLayout();

  const crumbs: { label: string; href?: string }[] = [{ label: 'Docs', href: '/' }];

  if (pathname === '/') {
    crumbs.push({ label: 'Overview' });
  } else {
    const slug = pathname.slice(1);
    const article = filteredArticles.find((a) => {
      const href = normalizePath(articleHref(a));
      return href === pathname || a.slug === slug;
    });
    crumbs.push({ label: 'Topics', href: '/' });
    crumbs.push({ label: article?.title ?? slug });
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm sm:flex">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            ) : null}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="truncate text-muted-foreground transition-colors hover:text-primary"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={cn('truncate', isLast ? 'font-semibold text-foreground' : 'text-muted-foreground')}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
