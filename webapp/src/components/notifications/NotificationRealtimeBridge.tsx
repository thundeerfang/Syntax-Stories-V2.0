"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { useNotificationStore } from "@/store/notifications";
import { notificationsStreamUrl } from "@/api/notifications";
import { consumeNotificationStream } from "@/lib/notifications/notificationStream";
import { notificationIconComponent } from "@/lib/notifications/notificationIcons";
import { NOTIFICATION_TYPE_LABELS } from "@contracts/notificationsApi";
import type { AppNotification } from "@contracts/notificationsApi";
import { NOTIFICATION_TOASTER_ID } from "@/variable";
function showNotificationToast(n: AppNotification): void {
  const Icon = notificationIconComponent(n.icon);
  const typeLabel = NOTIFICATION_TYPE_LABELS[n.type] ?? "Alert";
  const primaryText = n.type === "settings_update" ? n.message : n.title;
  const secondaryText = n.type === "settings_update" ? n.title : n.message;
  toast("", {
    id: `notif-${n.id}`,
    toasterId: NOTIFICATION_TOASTER_ID,
    description: (
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/90">
          {typeLabel}
        </span>
        <Link href={n.href} className="block hover:underline leading-snug">
          {primaryText}
        </Link>
        <p className="text-xs font-semibold text-muted-foreground">
          {secondaryText}
        </p>
      </div>
    ),
    icon: (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border/25 bg-primary/10 text-primary">
        <Icon className="size-4 shrink-0" aria-hidden />
      </span>
    ),
    duration: 7000,
  });
}
export function NotificationRealtimeBridge() {
  const token = useAuthStore((s) => s.token);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const pushNotification = useNotificationStore((s) => s.pushNotification);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    abortRef.current?.abort();
    if (!token) {
      setUnreadCount(0);
      return undefined;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const connect = () => {
      if (cancelled) return;
      void consumeNotificationStream(
        notificationsStreamUrl(),
        token,
        (event) => {
          if (event.type === "snapshot") {
            setUnreadCount(event.unreadCount);
            return;
          }
          if (event.type === "notification" && event.payload?.notification) {
            const raw = event.payload.notification;
            const n: AppNotification = {
              id: raw.id,
              type: raw.type ?? raw.kind ?? "settings_update",
              title: raw.title,
              message: raw.message,
              href: raw.href,
              icon: raw.icon ?? "bell",
              time: raw.time,
              unread: raw.unread,
            };
            pushNotification(n);
            showNotificationToast(n);
          }
        },
        ac.signal,
      ).catch(() => {
        if (cancelled || ac.signal.aborted) return;
        retryTimer = setTimeout(connect, 8000);
      });
    };
    connect();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      ac.abort();
    };
  }, [token, setUnreadCount, pushNotification]);
  return null;
}
export { NOTIFICATION_TOASTER_ID } from "@/variable";
