'use client';

import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useDesktopShell } from '@/hooks/useDesktopShell';
import { useDropdown } from '@/components/ui/dropdown';
import { cn } from '@/lib/core/utils';
import {
  User,
  LogOut,
  Wallet,
  Award,
  Sparkles,
  CreditCard,
  Settings,
  UserPlus,
  MessageSquare,
  ChevronRight,
  Copy,
  Check,
  Repeat2,
} from 'lucide-react';
import { Switch } from '@/components/retroui/Switch';
import { UserPresenceDot } from '@/components/ui/UserPresenceDot';
import { SparkLottie, StreakFireLottie } from '@/components/ui';
import { followApi } from '@/api/follow';
import { useUserPresenceStatus } from '@/lib/presence/useUserPresenceStatus';
import { useUIStore } from '@/store/ui';

/** Same rules as profile/u pages: absolute http(s), `data:` SVG defaults from API, or API-relative uploads. */
function resolveAccountAvatarSrc(
  profileImg: string | undefined,
  image: string | undefined,
  username: string | undefined
): string {
  const raw = (profileImg || image)?.trim();
  const seed = username?.trim() || 'user';
  const dicebear = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  if (!raw) return dicebear;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:'))
    return raw;
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${base}${path}`;
}

const MENU_WIDTH = 256;

type AccountDropdownStats = {
  repostCount: number;
  respectCount: number;
  streakCount: number;
};

function formatDropdownStat(n: number): string {
  const v = Math.max(0, Math.floor(n));
  return v > 99 ? '99+' : String(v);
}

function readMenuAnchor(triggerEl: HTMLElement | null): { top: number; left: number } | null {
  if (!triggerEl) return null;
  const rect = triggerEl.getBoundingClientRect();
  return {
    top: rect.bottom + 8,
    left: Math.max(8, rect.right - MENU_WIDTH),
  };
}

export function AccountDropdown() {
  const { user, logout } = useAuth();
  const isDesktop = useDesktopShell();
  const { open, setOpen, close, rootRef, contentRef } = useDropdown();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<AccountDropdownStats>({
    repostCount: 0,
    respectCount: 0,
    streakCount: 0,
  });
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const feedbackVisible = useUIStore((s) => s.feedbackButtonVisible);
  const setFeedbackVisible = useUIStore((s) => s.setFeedbackButtonVisible);
  const presenceIndicatorEnabled = useUIStore((s) => s.presenceIndicatorEnabled);
  const setPresenceIndicatorEnabled = useUIStore((s) => s.setPresenceIndicatorEnabled);
  const presenceStatus = useUserPresenceStatus();

  const syncMenuAnchor = useCallback(() => {
    const anchor = readMenuAnchor(rootRef.current);
    if (anchor) setMenuAnchor(anchor);
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (open && isDesktop) syncMenuAnchor();
  }, [open, isDesktop, syncMenuAnchor]);

  useEffect(() => {
    if (!open || !isDesktop) return;
    const onResize = () => syncMenuAnchor();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, isDesktop, syncMenuAnchor]);

  useEffect(() => {
    const username = user?.username?.trim();
    if (!open || !username) return;
    let cancelled = false;
    void followApi
      .getPublicProfile(username)
      .then((res) => {
        if (cancelled || !res.success) return;
        setStats({
          repostCount: res.blogRepostCount ?? 0,
          respectCount: res.blogRespectReceivedCount ?? 0,
          streakCount: res.readStreak?.current ?? 0,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, user?.username]);

  const handleToggle = () => {
    if (open) {
      close();
      return;
    }
    setMenuAnchor(readMenuAnchor(rootRef.current));
    setOpen(true);
  };

  if (!user) return null;

  const displayName = user.name ?? user.fullName ?? user.username ?? user.email ?? 'Account';
  const username = user.username ? `@${user.username}` : (user.email ?? '');
  const fullAvatarUrl = resolveAccountAvatarSrc(user.profileImg, user.image, user.username);

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(username);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  type MenuLink = { href: string; label: string; icon: typeof User };
  type MenuItem = MenuLink;

  const menuSections: Array<{ id: string; items: MenuItem[] }> = [
    {
      id: 'account-profile-stack',
      items: [
        { href: '/profile', label: 'Your profile', icon: User },
        { href: '/wallet', label: 'Wallet', icon: Wallet },
        { href: '/achievements', label: 'Achievements', icon: Award },
        { href: '/settings?section=syntax-card', label: 'Syntax card', icon: CreditCard },
      ],
    },
    {
      id: 'account-settings-stack',
      items: [
        { href: '/settings', label: 'Settings', icon: Settings },
        { href: '/pricing', label: 'Pricing', icon: CreditCard },
        { href: '/invite', label: 'Invite friends', icon: UserPlus },
      ],
    },
  ];

  return (
    <div className="relative inline-block" ref={rootRef}>
      {/* Trigger Button */}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={handleToggle}
        className={cn(
          'group relative flex items-center justify-center w-10 h-10 border-2 border-border bg-card transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
          isDesktop && 'desktop-titlebar-control',
          open ? 'border-primary shadow-none translate-x-[2px] translate-y-[2px]' : 'shadow'
        )}
      >
        <div className="h-full w-full overflow-hidden">
          <img src={fullAvatarUrl} alt="" className="h-full w-full object-cover" />
        </div>
        <UserPresenceDot />
      </button>

      {(() => {
        const menuPositionStyle =
          isDesktop && menuAnchor
            ? { top: menuAnchor.top, left: menuAnchor.left }
            : undefined;

        const menuPanel = (
          <AnimatePresence initial={false}>
            {open ? (
              <motion.div
                key="account-dropdown-menu"
                ref={contentRef}
                role="menu"
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'flex w-64 flex-col overflow-hidden border-2 border-border bg-card shadow',
                  isDesktop
                    ? 'fixed z-[160]'
                    : 'absolute right-0 top-[calc(100%+8px)] z-[200]'
                )}
                style={menuPositionStyle}
              >
            {/* Header Section */}
            <div className="p-3 border-b-2 border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 border-2 border-border bg-card shadow">
                  <div className="h-full w-full overflow-hidden">
                    <img src={fullAvatarUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <UserPresenceDot />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[12px] font-black uppercase italic truncate text-foreground leading-none">
                    {displayName}
                  </h3>
                  <button
                    onClick={handleCopyUsername}
                    className="flex items-center gap-1 mt-1 text-[9px] font-bold text-muted-foreground hover:text-primary transition-colors group/copy"
                  >
                    <span className="truncate max-w-[90px]">{username}</span>
                    {copied ? (
                      <Check className="h-2.5 w-2.5 text-green-500" />
                    ) : (
                      <Copy className="h-2.5 w-2.5 opacity-40 group-hover/copy:opacity-100" />
                    )}
                  </button>
                </div>
              </div>

              <Link
                href="/pricing"
                onClick={() => close()}
                className="mt-3 flex w-full items-center justify-center gap-1.5 border-2 border-border bg-primary py-1.5 text-[9px] font-black uppercase tracking-tight text-primary-foreground"
              >
                <Sparkles className="h-3 w-3 fill-current" />
                Upgrade Member
              </Link>
            </div>

            <div className="grid grid-cols-3 border-b-2 border-border bg-border gap-[2px]">
              <Link
                href="/reposts"
                onClick={() => close()}
                className="flex flex-col items-center justify-center bg-card py-1.5 hover:bg-muted transition-colors group/stat"
              >
                <Repeat2
                  className="mb-0.5 size-4 shrink-0 text-primary"
                  strokeWidth={2.5}
                  aria-hidden
                />
                <span className="text-[10px] font-black tabular-nums text-foreground">
                  {formatDropdownStat(stats.repostCount)}
                </span>
                <span className="text-[7px] font-black uppercase text-muted-foreground group-hover/stat:text-primary transition-colors">
                  Reposts
                </span>
              </Link>
              <Link
                href="/profile"
                onClick={() => close()}
                className="flex flex-col items-center justify-center bg-card py-1.5 hover:bg-muted transition-colors group/stat"
              >
                <div className="mb-0.5 flex h-5 w-5 items-center justify-center">
                  <SparkLottie play={open} size={20} />
                </div>
                <span className="text-[10px] font-black tabular-nums text-foreground">
                  {formatDropdownStat(stats.respectCount)}
                </span>
                <span className="text-[7px] font-black uppercase text-muted-foreground group-hover/stat:text-primary transition-colors">
                  Respect
                </span>
              </Link>
              <Link
                href="/profile"
                onClick={() => close()}
                className="flex flex-col items-center justify-center bg-card py-1.5 hover:bg-muted transition-colors group/stat"
              >
                <div className="mb-0.5 flex h-5 w-5 items-center justify-center">
                  <StreakFireLottie play={open} size={20} />
                </div>
                <span className="text-[10px] font-black tabular-nums text-foreground">
                  {formatDropdownStat(stats.streakCount)}
                </span>
                <span className="text-[7px] font-black uppercase text-muted-foreground group-hover/stat:text-primary transition-colors">
                  Streak
                </span>
              </Link>
            </div>

            {/* Menu Sections */}
            <div className="flex flex-col">
              {menuSections.map((section, sectionIdx) => (
                <div key={section.id} className="py-0.5 border-b-2 border-border last:border-b-0">
                  {section.items.map((item, itemIdx) => (
                    <motion.div
                      key={item.label}
                      initial={{ x: -4, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: sectionIdx * 0.1 + itemIdx * 0.03 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => close()}
                        className="group flex items-center gap-3 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-foreground hover:bg-muted transition-all active:bg-primary active:text-primary-foreground"
                      >
                        <item.icon
                          className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all"
                          strokeWidth={2.5}
                        />
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ))}

              {/* Toggles & Help */}
              <div className="bg-muted/10">
                <div className="px-4 py-2 flex items-center justify-between border-b-2 border-border">
                  <div className="flex items-center gap-3">
                    <MessageSquare
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={2.5}
                    />
                    <span className="text-[10px] font-bold uppercase text-foreground">
                      Feedback
                    </span>
                  </div>
                  <div className="scale-75 origin-right">
                    <Switch checked={feedbackVisible} onCheckedChange={setFeedbackVisible} />
                  </div>
                </div>

                <div className="flex items-center justify-between border-b-2 border-border px-4 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`size-2.5 shrink-0 border-2 border-border ${
                        presenceIndicatorEnabled && presenceStatus === 'online'
                          ? 'bg-green-500 presence-dot-blink'
                          : presenceIndicatorEnabled
                            ? 'bg-muted-foreground/75'
                            : 'bg-transparent'
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase text-foreground">
                        Online status
                      </span>
                    </div>
                  </div>
                  <div className="origin-right scale-75">
                    <Switch
                      checked={presenceIndicatorEnabled}
                      onCheckedChange={setPresenceIndicatorEnabled}
                      aria-label="Show online status indicator"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Footer */}
            <div className="p-3 bg-card border-t-2 border-border">
              <button
                onClick={() => {
                  close();
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 border-2 border-destructive bg-destructive/5 py-2 text-[10px] font-black uppercase text-destructive shadow transition-all hover:bg-destructive/10 active:translate-x-[1px] active:translate-y-[1px] active:bg-destructive active:text-destructive-foreground active:shadow-none"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={3} />
                Sign Out
              </button>

              <div className="mt-2.5 flex flex-wrap justify-center items-center gap-2">
                <Link
                  href="/terms"
                  onClick={() => close()}
                  className="text-[8px] font-bold uppercase text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms
                </Link>
                <div className="w-1 h-1 bg-border" />
                <Link
                  href="/privacy"
                  onClick={() => close()}
                  className="text-[8px] font-bold uppercase text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy
                </Link>
                <div className="w-1 h-1 bg-border" />
                <Link
                  href="/user-data-deletion"
                  onClick={() => close()}
                  className="text-[8px] font-bold uppercase text-muted-foreground hover:text-primary transition-colors"
                >
                  UDD
                </Link>
              </div>
              </div>
            </motion.div>
            ) : null}
          </AnimatePresence>
        );

        if (isDesktop && portalReady) {
          return createPortal(menuPanel, document.body);
        }
        return menuPanel;
      })()}
    </div>
  );
}
