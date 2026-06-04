'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Command,
  ExternalLink,
  HelpCircle,
  Moon,
  Rocket,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { articleHref, webappUrl } from '@/lib/config/site';
import { RETRO_NAV_LINK, RETRO_NAV_LINK_ACTIVE, RETRO_SECTION_LABEL } from '@/lib/retroUi';
import { useDocsLayout } from './DocsLayoutContext';
import { useDocsTheme } from './DocsThemeProvider';
import { DocsLogo } from './DocsLogo';

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left transition-colors hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className={RETRO_SECTION_LABEL}>{title}</span>
      </button>
      {open ? children : null}
    </div>
  );
}

export function DocsSidebar() {
  const pathname = normalizePath(usePathname() ?? '/');
  const { filteredArticles, searchQuery, setSearchQuery, mobileNavOpen, setMobileNavOpen } =
    useDocsLayout();
  const { theme, toggleTheme, mounted } = useDocsTheme();
  const searchRef = useRef<HTMLInputElement>(null);
  const [introOpen, setIntroOpen] = useState(true);
  const [topicsOpen, setTopicsOpen] = useState(true);

  const helpUrl = `${webappUrl()}/help`;
  const appUrl = webappUrl();

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusSearch]);

  const navBody = (
    <>
      <div className="flex shrink-0 items-center gap-2 px-4 py-3">
        <DocsLogo variant="mark" href="/" className="shrink-0" />
        <Link href="/" className="min-w-0 flex-1 truncate text-sm">
          <span className="text-muted-foreground"> / </span>
          <span className="font-bold text-foreground">Docs</span>
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center border-2 border-border bg-card text-foreground shadow transition-all hover:bg-muted active:translate-x-px active:translate-y-px active:shadow-none"
        >
          {mounted ? (
            theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Moon className="h-3.5 w-3.5" aria-hidden />
            )
          ) : (
            <span className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 px-4 py-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search docs"
            aria-label="Search documentation"
            className={cn(
              'h-9 w-full border-2 border-border bg-background pl-9 pr-14 text-sm shadow',
              'placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            <Command className="h-2.5 w-2.5" aria-hidden />K
          </kbd>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <CollapsibleSection title="Introduction" open={introOpen} onToggle={() => setIntroOpen((v) => !v)}>
          <ul className="mt-0.5 space-y-0.5 pl-1">
            <li>
              <Link
                href="/"
                onClick={() => setMobileNavOpen(false)}
                className={cn(RETRO_NAV_LINK, pathname === '/' && RETRO_NAV_LINK_ACTIVE)}
              >
                Overview
              </Link>
            </li>
          </ul>
        </CollapsibleSection>

        {(filteredArticles.length > 0 || searchQuery.trim()) && (
          <CollapsibleSection title="Topics" open={topicsOpen} onToggle={() => setTopicsOpen((v) => !v)}>
            {filteredArticles.length > 0 ? (
              <ul className="mt-0.5 space-y-0.5 pl-1">
                {filteredArticles.map((a) => {
                  const href = articleHref(a);
                  const active = pathname === normalizePath(href);
                  return (
                    <li key={a.slug}>
                      <Link
                        href={href}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(RETRO_NAV_LINK, active && RETRO_NAV_LINK_ACTIVE)}
                      >
                        <span className="truncate">{a.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-3 py-2 text-xs text-muted-foreground">No topics match your search.</p>
            )}
          </CollapsibleSection>
        )}
      </nav>

      <footer className="mt-auto shrink-0 border-t-2 border-sidebar-border bg-muted/25 p-4">
        <ul className="space-y-1">
          <li>
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Rocket className="h-3.5 w-3.5 shrink-0" />
              Open the app
              <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
            </a>
          </li>
          <li>
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <HelpCircle className="h-3.5 w-3.5 shrink-0" />
              Help center
              <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
            </a>
          </li>
        </ul>
      </footer>
    </>
  );

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r-2 border-sidebar-border bg-sidebar lg:flex xl:w-72">
        {navBody}
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation overlay"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-[min(100%,18rem)] flex-col border-r-2 border-sidebar-border bg-sidebar shadow-[4px_0_0_0_var(--shadow-color)]">
            {navBody}
          </aside>
        </div>
      ) : null}
    </>
  );
}
