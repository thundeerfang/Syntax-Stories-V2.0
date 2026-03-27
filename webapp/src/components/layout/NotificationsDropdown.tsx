'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const placeholderNotifications = [
  { id: '1', title: 'New story', message: 'Someone you follow published "Getting started with React Server Components"', href: '/', time: '2h ago', unread: true },
  { id: '2', title: 'Likes', message: 'Your story "API design tips" received 12 new likes', href: '/', time: '5h ago', unread: true },
  { id: '3', title: 'Comment', message: 'Alex commented on your story', href: '/', time: '1d ago', unread: false },
];

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const unreadCount = placeholderNotifications.filter((n) => n.unread).length;
  let menuHeaderUnreadLabel = '0';
  if (unreadCount > 0) {
    menuHeaderUnreadLabel = unreadCount > 9 ? '9+' : String(unreadCount);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="relative p-2 border-2 border-border bg-background text-foreground hover:border-primary hover:text-primary transition-all shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        aria-label={unreadCount ? `${unreadCount} notifications` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {unreadCount > 9 ? '9+' : String(unreadCount)}
          </span>
        )}
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-3 w-80 sm:w-96 border-2 border-border bg-card shadow-[6px_6px_0px_0px_var(--border)]"
          role="menu"
        >
          <div className="border-b-2 border-border px-4 py-3 flex items-center justify-between bg-muted/30">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center border-2 border-border bg-card text-[9px]">
                {menuHeaderUnreadLabel}
              </span>
              <span>Notifications</span>
            </h3>
            {unreadCount > 0 && (
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
              >
                Mark all read
              </Link>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto bg-card">
            {placeholderNotifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                You&apos;re all caught up
              </li>
            ) : (
              placeholderNotifications.map((n) => (
                <li key={n.id} role="none">
                  <Link
                    href={n.href}
                    onClick={() => setIsOpen(false)}
                    role="menuitem"
                    className={cn(
                      'flex gap-3 border-b border-border px-4 py-3 hover:bg-muted/40 transition-colors',
                      n.unread && 'bg-primary/5'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-1 h-2 w-2 rounded-full border border-border',
                        n.unread ? 'bg-primary' : 'bg-muted'
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
          <div className="border-t-2 border-border p-2 bg-muted/40">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-[11px] font-black text-primary hover:underline py-2 uppercase tracking-widest"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
