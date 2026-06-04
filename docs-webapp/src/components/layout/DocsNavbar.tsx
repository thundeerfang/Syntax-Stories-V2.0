'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { webappUrl } from '@/lib/config/site';
import { RETRO_BTN_GHOST, RETRO_BTN_PRIMARY } from '@/lib/retroUi';
import { useDocsLayout } from './DocsLayoutContext';
import { DocsBreadcrumbs } from './DocsBreadcrumbs';
import { docsContentPaddingX } from './docsContentPadding';

export function DocsNavbar() {
  const { siteName, setMobileNavOpen } = useDocsLayout();
  const getStartedHref = `${webappUrl()}/signup`;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b-2 border-border bg-navbar',
        docsContentPaddingX
      )}
    >
      <button
        type="button"
        className={cn(RETRO_BTN_GHOST, 'lg:hidden')}
        aria-label="Open navigation"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <Link
        href="/"
        className="shrink-0 text-sm font-bold tracking-tight text-foreground sm:hidden"
      >
        {siteName}
      </Link>

      <DocsBreadcrumbs />

      <div className="ml-auto flex shrink-0 items-center">
        <a href={getStartedHref} className={RETRO_BTN_PRIMARY}>
          Get started
        </a>
      </div>
    </header>
  );
}
