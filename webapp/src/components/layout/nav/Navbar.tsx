'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useSidebar } from '@/hooks/useSidebar';
import { useAuthDialogStore } from '@/store/authDialog';
import { useSearchDialogStore } from '@/store/searchDialog';
import { Button, FireLottie, RocketLottie, blockShadowButtonClassNames } from '@/components/ui';
import { NotificationsDropdown } from './NotificationsDropdown';
import { AccountDropdown } from './AccountDropdown';
import { MAIN_SHELL_NAV_LINKS } from '@/lib/shell/mainNavLinks';
import { cn } from '@/lib/core/utils';
import {
  SHELL_NAV_INNER_CLASS,
  SHELL_RAIL_FROST_CLASS,
  SHELL_RAIL_FROST_STYLE,
} from '@/lib/shell/shellContentRail';
import { setWriteEditorSessionPostId } from '@/lib/blog/writeBlogSession';
import { Sun, Moon, Menu, X, Search, Command, PenLine } from 'lucide-react';
import { NavbarSkeleton } from '@/components/skeletons';

const navLinks = MAIN_SHELL_NAV_LINKS;

const BANNER_DISMISSED_KEY = 'syntax-stories-banner-dismissed';

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { toggle: toggleSidebar } = useSidebar();
  const openAuthDialog = useAuthDialogStore((s) => s.open);
  const openSearch = useSearchDialogStore((s) => s.open);

  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [exploreHovered, setExploreHovered] = useState(false);
  const [trendingHovered, setTrendingHovered] = useState(false);
  /** Scrolled state: primary bottom border (height + frost stay fixed). */
  const [isPastViewport, setIsPastViewport] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
    setBannerDismissed(dismissed);

    const syncScroll = () => {
      const y = Math.max(
        0,
        window.scrollY,
        document.documentElement.scrollTop,
        document.body.scrollTop
      );
      /** Same pixel threshold on every route (long pages no longer require a full viewport of scroll). */
      const enterY = 56;
      const exitY = 24;

      setIsPastViewport((prev) => {
        if (prev) return y > exitY;
        return y >= enterY;
      });
    };
    syncScroll();
    window.addEventListener('scroll', syncScroll, { passive: true });
    window.addEventListener('resize', syncScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', syncScroll);
      window.removeEventListener('resize', syncScroll);
    };
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
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
  }, [mounted, bannerDismissed]);

  const dismissBanner = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setBannerDismissed(true);
  };

  if (!mounted) return <NavbarSkeleton />;

  return (
    <header
      ref={headerRef}
      className={cn(
        'w-full shrink-0 border-b-2 pt-[env(safe-area-inset-top,0px)] transition-[border-color] duration-300',
        isPastViewport ? 'border-primary' : 'border-border'
      )}
    >
      {/* Top banner */}
      {!bannerDismissed && (
        <div className="relative flex items-center justify-center bg-primary px-10 py-2 text-primary-foreground group overflow-hidden">
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 italic pointer-events-none" />
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
            A collaborative project, crafted with ❤️ by our team.
          </p>
          <button
            onClick={dismissBanner}
            className="absolute right-2 p-1 hover:bg-primary-foreground hover:text-primary transition-colors"
            aria-label="Close banner"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        </div>
      )}

      {/* Frost: explicit webkit + backdrop so blur shows over the main column */}
      <div
        className={cn('relative isolate overflow-visible', SHELL_RAIL_FROST_CLASS)}
        style={SHELL_RAIL_FROST_STYLE}
      >
        <div className={cn('relative z-[1] flex h-16 items-center gap-4', SHELL_NAV_INNER_CLASS)}>
          {/* Left: Menu + Logo */}
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="group relative border-2 border-border bg-card p-2 text-foreground transition-all hover:border-primary active:translate-y-0.5"
            >
              <Menu
                className="h-5 w-5 text-foreground transition-colors group-hover:text-primary"
                strokeWidth={2.5}
                aria-hidden
              />
            </button>
            <Link href="/" className="shrink-0">
              <img
                src="/svg/logo_hori.png"
                alt="Syntax Stories"
                className="h-6 w-auto object-contain sm:h-9"
              />
            </Link>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden lg:flex items-center justify-center gap-1">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
              const isExplore = href === '/explore';
              const isTrending = href === '/trending';

              return (
                <Link
                  key={href}
                  href={href}
                  onMouseEnter={() => {
                    if (isExplore) setExploreHovered(true);
                    else if (isTrending) setTrendingHovered(true);
                  }}
                  onMouseLeave={() => {
                    if (isExplore) setExploreHovered(false);
                    else if (isTrending) setTrendingHovered(false);
                  }}
                  className={cn(
                    'group relative px-4 py-2 text-[11px] font-black tracking-widest transition-all overflow-hidden',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isExplore && <RocketLottie play={exploreHovered} />}
                    {isTrending && <FireLottie play={trendingHovered} />}
                    {label}
                  </span>
                  {/* Underline/Pill Effect */}
                  {isActive && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary" />}
                  <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-200" />
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
            {/* Search Bar UI */}
            <button
              onClick={openSearch}
              className="hidden md:flex flex-1 max-w-[240px] items-center justify-between gap-2 border-2 border-border bg-muted/30 px-3 py-1.5 transition-all hover:border-primary hover:bg-background group"
            >
              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground">
                <Search className="h-4 w-4" strokeWidth={2.5} />
                <span className="text-[11px] font-bold uppercase tracking-tight">
                  Search Stories...
                </span>
              </div>
              <div className="flex items-center gap-1 border border-border bg-background px-1.5 py-0.5 text-[10px] font-black text-muted-foreground">
                <Command className="h-2.5 w-2.5" /> K
              </div>
            </button>

            {/* Mobile Search Icon only */}
            <button
              type="button"
              onClick={openSearch}
              className="border-2 border-transparent p-2 text-foreground transition-all hover:border-primary md:hidden"
            >
              <Search className="h-5 w-5 text-foreground" strokeWidth={2.5} />
            </button>

            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <Link
                  href="/blogs/write"
                  onClick={() => setWriteEditorSessionPostId(null)}
                  className={cn(
                    blockShadowButtonClassNames({ variant: 'primary', size: 'sm', shadow: 'sm' }),
                    'px-2 py-1.5 sm:px-3 sm:py-2 no-underline'
                  )}
                  title="Write a blog post"
                >
                  <PenLine className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Write</span>
                </Link>
              )}
              <NotificationsDropdown />

              <button
                type="button"
                onClick={toggleTheme}
                className="relative hidden sm:flex items-center justify-center p-2 border-2 border-border bg-background text-foreground hover:border-primary hover:text-primary transition-all shadow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="h-4 w-4 text-foreground" strokeWidth={2.5} />
                ) : (
                  <Moon className="h-4 w-4 text-foreground" strokeWidth={2.5} />
                )}
              </button>

              <div className="h-8 w-[2px] bg-border mx-1 hidden sm:block" />

              {isAuthenticated ? (
                <AccountDropdown />
              ) : (
                <Button
                  onClick={() => openAuthDialog('login')}
                  variant="outline"
                  className="border-2 border-primary bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-tighter hover:bg-background hover:text-primary transition-all shadow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Join Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
