'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useSidebar } from '@/hooks/useSidebar';
import { useAuthDialogStore } from '@/store/authDialog';
import { useSearchDialogStore } from '@/store/searchDialog';
import { Button, Dialog } from '@/components/ui';
import { NotificationsDropdown } from './NotificationsDropdown';
import { AccountDropdown } from './AccountDropdown';
import { cn } from '@/lib/utils';
import { FireLottie, RocketLottie } from '@/components/ui';
import { Sun, Moon, Menu, X, Search } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'HOME' },
  { href: '/explore', label: 'EXPLORE' },
  { href: '/trending', label: 'TRENDING' },
  { href: '/about', label: 'ABOUT' },
];

const BANNER_HEIGHT = '2.5rem';
/** localStorage: banner stays hidden until user clears browser cache */
const BANNER_DISMISSED_KEY = 'syntax-stories-banner-dismissed';

function getBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { toggle: toggleSidebar } = useSidebar();
  const openAuthDialog = useAuthDialogStore((s) => s.open);
  const openSearch = useSearchDialogStore((s) => s.open);
  const [bannerDismissed, setBannerDismissed] = useState(true); // start hidden until we read localStorage
  const [bannerReady, setBannerReady] = useState(false);
  const [showBannerDismissDialog, setShowBannerDismissDialog] = useState(false);
  const [exploreHovered, setExploreHovered] = useState(false);
  const [trendingHovered, setTrendingHovered] = useState(false);
  const [searchKbd, setSearchKbd] = useState('Ctrl + K');

  useEffect(() => {
    setBannerDismissed(getBannerDismissed());
    setBannerReady(true);
  }, []);

  useEffect(() => {
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    setSearchKbd(isMac ? '⌘ + K' : 'Ctrl + K');
  }, []);

  useEffect(() => {
    const showBanner = bannerReady && !bannerDismissed;
    const headerHeight = showBanner ? '6.5rem' : '4rem';
    document.documentElement.style.setProperty('--header-height', headerHeight);
  }, [bannerReady, bannerDismissed]);

  const dismissBanner = () => {
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
    setBannerDismissed(true);
    setShowBannerDismissDialog(true);
  };

  return (
    <>
    <header className="sticky top-0 z-30 w-full border-b-2 border-border bg-background">
      {/* Centered Membership Banner — hidden until user clears cache (localStorage) */}
      {bannerReady && !bannerDismissed && (
        <div
          className="relative flex items-center justify-center border-b-2 border-border bg-primary px-10 py-1.5 text-primary-foreground"
          style={{ minHeight: BANNER_HEIGHT }}
        >
          <p className="text-xs font-black uppercase tracking-widest text-primary-foreground">
          Become a member — unlimited access for less than $1/week.
          </p>
          <button
            type="button"
            onClick={dismissBanner}
            className="absolute right-3 p-1 border-2 border-primary-foreground/30 hover:bg-primary-foreground hover:text-primary transition-all active:translate-y-0.5"
            aria-label="Close banner"
          >
            <X className="h-3 w-3" strokeWidth={3} />
          </button>
        </div>
      )}

      <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center px-4 sm:px-8">
        {/* Left: Menu + Logo */}
        <div className="flex flex-1 items-center gap-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 border-2 border-border bg-card text-foreground shadow-sm hover:border-primary hover:text-primary transition-all"
          >
            <Menu className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <Link
            href="/"
            className="text-lg font-black italic tracking-tighter text-foreground border-2 border-transparent hover:border-border px-2 transition-all uppercase no-underline"
          >
            Syntax_Stories
          </Link>
        </div>

        {/* Center: Nav Links with Bottom Border Only */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-6">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            const isExplore = href === '/explore';
            const isTrending = href === '/trending';
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative h-16 flex items-center gap-1.5 text-xs font-black tracking-widest transition-all border-b-2',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-primary hover:text-foreground'
                )}
                onMouseEnter={
                  isExplore
                    ? () => setExploreHovered(true)
                    : isTrending
                      ? () => setTrendingHovered(true)
                      : undefined
                }
                onMouseLeave={
                  isExplore
                    ? () => setExploreHovered(false)
                    : isTrending
                      ? () => setTrendingHovered(false)
                      : undefined
                }
              >
                {isExplore && <RocketLottie play={exploreHovered} />}
                {isTrending && <FireLottie play={trendingHovered} />}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search + Notifications + Theme + Auth */}
        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={openSearch}
            className="flex items-center gap-2 border-2 border-border bg-background pl-2 sm:pl-3 pr-2 py-1.5 text-xs font-bold uppercase text-muted-foreground hover:border-primary hover:text-foreground transition-all min-w-0"
            aria-label="Search (opens with Ctrl+K or Cmd+K)"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline truncate max-w-24 md:max-w-none">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-xs font-medium text-muted-foreground shrink-0">
              {searchKbd}
            </kbd>
          </button>

          <NotificationsDropdown />

          <button
            type="button"
            onClick={toggleTheme}
            className="w-12 h-9 flex items-center justify-center border-2 border-border bg-background text-primary shadow-sm hover:border-primary transition-all active:translate-y-0.5"
            aria-label="Toggle Theme"
          >
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {isAuthenticated ? (
            <AccountDropdown />
          ) : (
            <Button
              onClick={() => openAuthDialog('login')}
              variant="outline"
              size="sm"
              className="border-2 border-border font-black text-xs uppercase tracking-widest hover:border-primary hover:text-primary"
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>

    <Dialog
      open={showBannerDismissDialog}
      onClose={() => setShowBannerDismissDialog(false)}
      titleId="banner-dismiss-dialog-title"
    >
      <h2 id="banner-dismiss-dialog-title" className="text-sm font-black uppercase tracking-widest text-foreground">
        Banner hidden
      </h2>
      <p className="mt-2 text-xs text-muted-foreground">
        We won&apos;t show this banner again until you clear your browser cache or site data.
      </p>
      <Button
        onClick={() => setShowBannerDismissDialog(false)}
        className="mt-4 w-full text-xs font-black uppercase tracking-widest"
      >
        OK
      </Button>
    </Dialog>
    </>
  );
}