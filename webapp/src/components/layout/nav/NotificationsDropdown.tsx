'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, CheckCheck, Loader2, Settings } from 'lucide-react';
import { useDropdown } from '@/components/ui/dropdown';
import { cn } from '@/lib/core/utils';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { useNotificationStore } from '@/store/notifications';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/api/notifications';
import { notificationIconComponent } from '@/lib/notifications/notificationIcons';
import { NOTIFICATION_TYPE_LABELS } from '@contracts/notificationsApi';

export function NotificationsDropdown() {
  const token = useAuthStore((s) => s.token);
  const openAuth = useAuthDialogStore((s) => s.open);
  const storeUnread = useNotificationStore((s) => s.unreadCount);
  const bumpVersion = useNotificationStore((s) => s.bumpVersion);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const { open: isOpen, setOpen: setIsOpen, close, rootRef: panelRef } = useDropdown();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const { notifications, unreadCount } = await fetchNotifications(token);
      setItems(notifications);
      setUnreadCount(unreadCount);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, setUnreadCount]);

  useEffect(() => {
    if (isOpen && token) {
      void load();
    }
    if (!isOpen) {
      setLoading(false);
    }
  }, [isOpen, token, load]);

  useEffect(() => {
    if (!token || isOpen) return;
    void load();
  }, [bumpVersion, token, isOpen, load]);

  const unreadCount = storeUnread || items.filter((n) => n.unread).length;
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  const handleMarkAllRead = async () => {
    if (!token || unreadCount === 0) return;
    setMarkingRead(true);
    try {
      await markAllNotificationsRead(token);
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
      setUnreadCount(0);
    } catch {
      /* keep UI unchanged on failure */
    } finally {
      setMarkingRead(false);
    }
  };

  const handleItemClick = async (n: AppNotification) => {
    if (!token || !n.unread) return;
    try {
      await markNotificationRead(token, n.id);
      setItems((prev) => prev.map((row) => (row.id === n.id ? { ...row, unread: false } : row)));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          'relative p-2 border-2 border-border bg-background text-foreground transition-all shadow',
          'hover:border-primary hover:text-primary active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
          isOpen && 'border-primary text-primary'
        )}
        aria-label={unreadCount ? `${unreadCount} notifications` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex min-h-4 min-w-4 items-center justify-center bg-primary px-0.5 text-[10px] font-black text-primary-foreground border border-primary-foreground/20">
            {unreadLabel}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-[200] mt-3 w-[min(100vw-1.5rem,26rem)] border-2 border-border bg-card shadow-lg overflow-hidden"
          role="menu"
        >
          <div className="border-b-2 border-border px-4 py-3 flex items-center justify-between bg-gradient-to-r from-primary/10 via-card to-card">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex h-8 w-8 items-center justify-center border-2 border-border bg-card text-primary shadow-sm">
                <Bell className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground truncate">
                  Notifications
                </h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  {unreadCount > 0 ? `${unreadLabel} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            {token && unreadCount > 0 && (
              <button
                type="button"
                disabled={markingRead}
                onClick={() => void handleMarkAllRead()}
                aria-label="Mark all read"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
              >
                {markingRead ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <CheckCheck className="size-4" aria-hidden />
                )}
              </button>
            )}
          </div>

          <ul className="max-h-[min(24rem,60vh)] overflow-y-auto bg-card divide-y divide-border/80">
            {!token ? (
              <li className="px-4 py-10 text-center">
                <BellOff className="size-8 mx-auto text-muted-foreground/60 mb-3" aria-hidden />
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Sign in to see notifications
                </p>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    openAuth('login');
                  }}
                  className="mt-4 border-2 border-border bg-primary px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow hover:opacity-90"
                >
                  Log in
                </button>
              </li>
            ) : loading ? (
              <li className="flex flex-col items-center justify-center px-4 py-12 gap-2">
                <Loader2 className="size-7 animate-spin text-primary" aria-label="Loading notifications" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Loading
                </span>
              </li>
            ) : items.length === 0 ? (
              <li className="px-4 py-12 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center border-2 border-dashed border-border bg-muted/20 text-muted-foreground mb-3">
                  <Bell className="size-5" aria-hidden />
                </span>
                <p className="text-sm font-bold text-foreground">You&apos;re all caught up</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[14rem] mx-auto">
                  Milestones, follows, trending, and settings updates will appear here.
                </p>
              </li>
            ) : (
              items.map((n) => {
                const Icon = notificationIconComponent(n.icon);
                const typeLabel = NOTIFICATION_TYPE_LABELS[n.type] ?? 'Alert';
                return (
                  <li key={n.id} role="none">
                    <Link
                      href={n.href}
                      onClick={() => {
                        void handleItemClick(n);
                        close();
                      }}
                      role="menuitem"
                      className={cn(
                        'group flex gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50',
                        n.unread && 'bg-primary/[0.06]'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border shadow-sm transition-colors',
                          n.unread
                            ? 'bg-primary/15 text-primary group-hover:bg-primary/20'
                            : 'bg-muted/30 text-muted-foreground'
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">
                            {typeLabel}
                          </span>
                          {n.unread && (
                            <span className="h-1.5 w-1.5 shrink-0 bg-primary" aria-hidden />
                          )}
                        </div>
                        <p className="text-sm font-bold text-foreground leading-snug line-clamp-1">
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground/80 mt-1.5 uppercase tracking-wide">
                          {n.time}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>

          {token && (
            <div className="border-t-2 border-border px-3 py-2 bg-muted/20">
              <Link
                href="/settings?section=notifications"
                onClick={() => close()}
                className="flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
              >
                <Settings className="size-3.5" aria-hidden />
                Notification preferences
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
