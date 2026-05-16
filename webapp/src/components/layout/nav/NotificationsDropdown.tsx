'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Loader2 } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { fetchNotifications, markAllNotificationsRead, type AppNotification } from '@/api/notifications';


export function NotificationsDropdown() {
  const token = useAuthStore((s) => s.token);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchNotifications(token);
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && token) {
      void load();
    }
    if (!isOpen) {
      setLoading(false);
    }
  }, [isOpen, token, load]);

  const unreadCount = items.filter((n) => n.unread).length;
  let menuHeaderUnreadLabel = '0';
  if (unreadCount > 0) {
    menuHeaderUnreadLabel = unreadCount > 9 ? '9+' : String(unreadCount);
  }

  const handleMarkAllRead = async () => {
    if (!token || unreadCount === 0) return;
    setMarkingRead(true);
    try {
      await markAllNotificationsRead(token);
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch {
      /* keep UI unchanged on failure */
    } finally {
      setMarkingRead(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="relative p-2 border-2 border-border bg-background text-foreground hover:border-primary hover:text-primary transition-all shadow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        aria-label={unreadCount ? `${unreadCount} notifications` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
            {unreadCount > 9 ? '9+' : String(unreadCount)}
          </span>
        )}
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-full z-[200] mt-3 w-80 sm:w-96 border-2 border-border bg-card shadow"
          role="menu"
        >
          <div className="border-b-2 border-border px-4 py-3 flex items-center justify-between bg-muted/30">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center border-2 border-border bg-card text-[9px]">
                {menuHeaderUnreadLabel}
              </span>
              <span>Notifications</span>
            </h3>
            {token && unreadCount > 0 && (
              <button
                type="button"
                disabled={markingRead}
                onClick={() => void handleMarkAllRead()}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest disabled:opacity-50"
              >
                {markingRead ? '…' : 'Mark all read'}
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto bg-card">
            {!token ? (
              <li className="px-4 py-6 text-center">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                  Sign in to see notifications
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openAuth('login');
                  }}
                  className="mt-3 border-2 border-border bg-primary px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow"
                >
                  Log in
                </button>
              </li>
            ) : loading ? (
              <li className="flex justify-center px-4 py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading notifications" />
              </li>
            ) : items.length === 0 ? (
              <li className="px-4 py-6 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                You&apos;re all caught up
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id} role="none">
                  <Link
                    href={n.href}
                    onClick={() => setIsOpen(false)}
                    role="menuitem"
                    className={cn(
                      'flex gap-3 border-b border-border px-4 py-3 hover:bg-muted/40 transition-colors',
                      n.unread && 'bg-primary/5',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-1 h-2 w-2  border border-border',
                        n.unread ? 'bg-primary' : 'bg-muted',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
