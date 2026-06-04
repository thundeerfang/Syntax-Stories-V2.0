'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useDesktopShell } from '@/hooks/useDesktopShell';
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
  BookOpen,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { Switch } from '@/components/retroui/Switch';
import { UserPresenceDot } from '@/components/ui/UserPresenceDot';
import { WalletLottie, SparkLottie, StreakFireLottie } from '@/components/ui';
import { useUserPresenceStatus } from '@/lib/presence/useUserPresenceStatus';
import { useUIStore } from '@/store/ui';
import { SyntaxCardDialog } from '@/components/profile';

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
  const [open, setOpen] = useState(false);
  const [syntaxCardOpen, setSyntaxCardOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const feedbackVisible = useUIStore((s) => s.feedbackButtonVisible);
  const setFeedbackVisible = useUIStore((s) => s.setFeedbackButtonVisible);
  const presenceIndicatorEnabled = useUIStore((s) => s.presenceIndicatorEnabled);
  const setPresenceIndicatorEnabled = useUIStore((s) => s.setPresenceIndicatorEnabled);
  const presenceStatus = useUserPresenceStatus();
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const syncMenuAnchor = useCallback(() => {
    const anchor = readMenuAnchor(ref.current);
    if (anchor) setMenuAnchor(anchor);
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useLayoutEffect(() => {
    if (open && isDesktop) syncMenuAnchor();
  }, [open, isDesktop, syncMenuAnchor]);

  useEffect(() => {
    if (!open || !isDesktop) return;
    const onLayout = () => syncMenuAnchor();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open, isDesktop, syncMenuAnchor]);

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setMenuAnchor(readMenuAnchor(ref.current));
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
  type MenuAction = { action: 'syntax-card'; label: string; icon: typeof CreditCard };
  type MenuItem = MenuLink | MenuAction;

  const menuSections: Array<{ id: string; items: MenuItem[] }> = [
    {
      id: 'account-profile-stack',
      items: [
        { href: '/profile', label: 'Your profile', icon: User },
        { href: '/wallet', label: 'Wallet', icon: Wallet },
        { href: '/achievements', label: 'Achievements', icon: Award },
        { action: 'syntax-card', label: 'Syntax card', icon: CreditCard },
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
    <div className="relative inline-block" ref={ref}>
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
                ref={menuRef}
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
                onClick={() => setOpen(false)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 border-2 border-border bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-tight shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
              >
                <Sparkles className="h-3 w-3 fill-current" />
                Upgrade Member
              </Link>
            </div>

            {/* Compressed Stats Grid - Cleaned hover and padding */}
            <div className="grid grid-cols-3 border-b-2 border-border bg-border gap-[2px]">
              {[
                { label: 'Wallet', val: 0, icon: WalletLottie },
                { label: 'Streak', val: 0, icon: StreakFireLottie },
                { label: 'Respect', val: 0, icon: SparkLottie },
              ].map((stat) => {
                const inner = (
                  <>
                    <div className="h-5 w-5 mb-0.5 flex items-center justify-center">
                      <stat.icon play={open} size={20} />
                    </div>
                    <span className="text-[10px] font-black tabular-nums text-foreground">
                      {stat.val}
                    </span>
                    <span className="text-[7px] font-black uppercase text-muted-foreground group-hover/stat:text-primary transition-colors">
                      {stat.label}
                    </span>
                  </>
                );
                if (stat.label === 'Wallet') {
                  return (
                    <Link
                      key={stat.label}
                      href="/wallet"
                      onClick={() => setOpen(false)}
                      className="bg-card py-1.5 flex flex-col items-center justify-center hover:bg-muted transition-colors group/stat"
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <div
                    key={stat.label}
                    className="bg-card py-1.5 flex flex-col items-center justify-center hover:bg-muted transition-colors group/stat"
                  >
                    {inner}
                  </div>
                );
              })}
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
                      {'action' in item ? (
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            setSyntaxCardOpen(true);
                          }}
                          className="group flex w-full items-center gap-3 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-foreground hover:bg-muted transition-all active:bg-primary active:text-primary-foreground"
                        >
                          <item.icon
                            className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all"
                            strokeWidth={2.5}
                          />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </button>
                      ) : (
                        <Link
                          href={'href' in item ? item.href : '#'}
                          onClick={() => setOpen(false)}
                          className="group flex items-center gap-3 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-foreground hover:bg-muted transition-all active:bg-primary active:text-primary-foreground"
                        >
                          <item.icon
                            className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all"
                            strokeWidth={2.5}
                          />
                          <span className="flex-1">{item.label}</span>
                          <ChevronRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </Link>
                      )}
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

                <div className="grid grid-cols-2 bg-card">
                  <Link
                    href="/docs"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-2 py-2 border-r-2 border-border border-b-2 border-b-transparent hover:border-b-primary hover:bg-muted transition-all text-[9px] font-black uppercase text-foreground"
                  >
                    <BookOpen className="h-3 w-3 text-muted-foreground" /> Documentation
                  </Link>
                  <Link
                    href="/support"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-2 py-2 border-b-2 border-b-transparent hover:border-b-primary hover:bg-muted transition-all text-[9px] font-black uppercase text-foreground"
                  >
                    <HelpCircle className="h-3 w-3 text-muted-foreground" /> Get Help
                  </Link>
                </div>
              </div>
            </div>

            {/* Logout Footer */}
            <div className="p-3 bg-card border-t-2 border-border">
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-destructive bg-destructive/5 text-destructive text-[10px] font-black uppercase shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all active:bg-destructive active:text-destructive-foreground"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={3} />
                Sign Out
              </button>

              <div className="mt-2.5 flex flex-wrap justify-center items-center gap-2">
                <Link
                  href="/terms"
                  onClick={() => setOpen(false)}
                  className="text-[8px] font-bold uppercase text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms
                </Link>
                <div className="w-1 h-1 bg-border" />
                <Link
                  href="/privacy"
                  onClick={() => setOpen(false)}
                  className="text-[8px] font-bold uppercase text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy
                </Link>
                <div className="w-1 h-1 bg-border" />
                <Link
                  href="/user-data-deletion"
                  onClick={() => setOpen(false)}
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

      <SyntaxCardDialog
        open={syntaxCardOpen}
        onClose={() => setSyntaxCardOpen(false)}
        username={user.username ?? ''}
        fullName={user.fullName ?? user.name ?? user.username ?? 'Developer'}
        profileImg={user.profileImg ?? user.image}
        coverBanner={user.coverBanner}
      />
    </div>
  );
}
