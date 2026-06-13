'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';
import { Menu, PenLine, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/hooks/useSidebar';
import { AccountDropdown } from '@/components/layout/nav/AccountDropdown';
import { Button, blockShadowButtonClassNames } from '@/components/ui';
import { useAuthDialogStore } from '@/store/authDialog';
import { useSearchDialogStore } from '@/store/searchDialog';
import { setWriteEditorSessionPostId } from '@/lib/blog/writeBlogSession';
import { MAIN_SHELL_NAV_LINKS } from '@/lib/shell/mainNavLinks';
import { cn } from '@/lib/core/utils';

const titleBarControlClass =
  'desktop-titlebar-control inline-flex shrink-0 items-center justify-center border-2 border-border bg-card text-foreground transition-all hover:border-primary active:translate-x-0.5 active:translate-y-0.5 active:shadow-none';

export function DesktopTitleBar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { isOpen, toggle: toggleSidebar } = useSidebar();
  const openAuthDialog = useAuthDialogStore((s) => s.open);
  const openSearch = useSearchDialogStore((s) => s.open);
  const headerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const sync = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        '--header-height',
        `${Math.round(h * 1000) / 1000}px`
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className="desktop-titlebar w-full shrink-0 border-b-2 border-border"
      data-desktop-titlebar
    >
      <div
        className="relative isolate overflow-visible bg-card"
      >
        <div className="relative z-[1] grid h-10 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 pr-3">
          <div className="flex shrink-0 items-center pl-1">
            <button
              type="button"
              onClick={toggleSidebar}
              className={cn(titleBarControlClass, 'p-1.5', isOpen && 'border-primary text-primary')}
              aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={isOpen}
            >
              <Menu className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex min-w-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap sm:gap-3">
            <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-[0.22em] text-foreground md:inline">
              Syntax Stories V2.0
            </span>
            <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              {MAIN_SHELL_NAV_LINKS.map(({ href, label }) => {
                const isActive =
                  pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'desktop-titlebar-control relative shrink-0 px-1.5 py-1 text-[9px] font-black uppercase tracking-widest transition-colors sm:px-2 sm:text-[10px]',
                      isActive
                        ? 'text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={openSearch}
              className={cn(titleBarControlClass, 'p-1.5')}
              aria-label="Search"
              title="Search"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} />
            </button>

            {isAuthenticated ? (
              <>
                <Link
                  href="/blogs/write"
                  onClick={() => setWriteEditorSessionPostId(null)}
                  className={cn(
                    blockShadowButtonClassNames({ variant: 'primary', size: 'sm', shadow: 'sm' }),
                    'desktop-titlebar-control shrink-0 gap-1 whitespace-nowrap px-2 py-1 no-underline'
                  )}
                  title="Write"
                >
                  <PenLine className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Write</span>
                </Link>
                <AccountDropdown />
              </>
            ) : (
              <Button
                onClick={() => openAuthDialog('login')}
                variant="outline"
                className="desktop-titlebar-control shrink-0 whitespace-nowrap border-2 border-primary bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-primary-foreground hover:bg-background hover:text-primary"
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
