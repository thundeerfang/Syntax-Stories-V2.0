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

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="relative p-2 border-2 border-border bg-background text-foreground hover:border-primary hover:text-primary transition-all"
        aria-label={unreadCount ? `${unreadCount} notifications` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 border-2 border-border bg-card shadow-lg"
          role="menu"
        >
          <div className="border-b-2 border-border px-4 py-3 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-primary hover:underline"
              >
                Mark all read
              </Link>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {placeholderNotifications.map((n) => (
              <li key={n.id} role="none">
                <Link
                  href={n.href}
                  onClick={() => setIsOpen(false)}
                  role="menuitem"
                  className={cn(
                    'block border-b border-border px-4 py-3 hover:bg-muted/50 transition-colors',
                    n.unread && 'bg-primary/5'
                  )}
                >
                  <p className="text-xs font-bold text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t-2 border-border p-2">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-xs font-bold text-primary hover:underline py-2"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
