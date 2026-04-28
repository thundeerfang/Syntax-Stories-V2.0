'use client';

import { useState, useEffect } from 'react';
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
import { cn } from '@/lib/utils';
import { setWriteEditorSessionPostId } from '@/lib/writeBlogSession';
import { Sun, Moon, Menu, X, Search, Command, PenLine } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'HOME' },
  { href: '/explore', label: 'EXPLORE' },
  { href: '/trending', label: 'TRENDING' },
  { href: '/about', label: 'ABOUT' },
];

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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
    setBannerDismissed(dismissed);

    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const showBanner = mounted && !bannerDismissed;
    /** Match outer `<header>` height: inner row (+ optional banner) + `border-b-2` so fixed sidebar starts below the navbar line. */
    const headerHeight = showBanner ? 'calc(6.5rem + 2px)' : 'calc(4rem + 2px)';
    document.documentElement.style.setProperty('--header-height', headerHeight);
  }, [mounted, bannerDismissed]);

  const dismissBanner = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setBannerDismissed(true);
  };

  if (!mounted) return <div className="h-16 w-full bg-background border-b-2 border-border" />;

  return (
    <header 
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled ? "border-b-2 border-primary shadow-[4px_4px_0px_0px_rgba(var(--primary),0.1)]" : "border-b-2 border-border"
      )}
    >
      {/* Membership Banner */}
      {!bannerDismissed && (
        <div className="relative flex items-center justify-center bg-primary px-10 py-2 text-primary-foreground group overflow-hidden">
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 italic pointer-events-none" />
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
            Become a member — unlimited access for less than $1/week.
          </p>
          <button
            onClick={dismissBanner}
            className="absolute right-2 p-1 hover:bg-primary-foreground hover:text-primary rounded-sm transition-colors"
            aria-label="Close banner"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <div className="bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
          
          {/* Left: Menu + Logo */}
          <div className="flex flex-1 items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="group relative p-2 border-2 border-border bg-card hover:border-primary transition-all active:translate-y-0.5"
            >
              <Menu className="h-5 w-5 group-hover:text-primary transition-colors" strokeWidth={2.5} />
            </button>
            <Link href="/" className="shrink-0">
              <img src="/svg/logo_hori.png" alt="Syntax Stories" className="h-6 w-auto object-contain sm:h-9" />
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
                  {isActive && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-primary" />
                  )}
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
                <span className="text-[11px] font-bold uppercase tracking-tight">Search Stories...</span>
              </div>
              <div className="flex items-center gap-1 border border-border bg-background px-1.5 py-0.5 rounded text-[10px] font-black text-muted-foreground">
                <Command className="h-2.5 w-2.5" /> K
              </div>
            </button>

            {/* Mobile Search Icon only */}
            <button onClick={openSearch} className="md:hidden p-2 text-foreground border-2 border-transparent hover:border-primary transition-all">
              <Search className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <Link
                  href="/blogs/write"
                  onClick={() => setWriteEditorSessionPostId(null)}
                  className={cn(
                    blockShadowButtonClassNames({ variant: 'secondary', size: 'sm', shadow: 'sm' }),
                    'px-2 py-1.5 sm:px-3 sm:py-2 no-underline',
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
                className="relative hidden sm:flex items-center justify-center p-2 border-2 border-border bg-background text-foreground hover:border-primary hover:text-primary transition-all shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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
                  className="border-2 border-primary bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-tighter hover:bg-background hover:text-primary transition-all shadow-[4px_4px_0px_0px_rgba(var(--primary),0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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