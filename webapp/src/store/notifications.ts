"use client";
import { create } from "zustand";
import type { AppNotification } from "@contracts/notificationsApi";
type NotificationStore = {
  unreadCount: number;
  latest: AppNotification | null;
  bumpVersion: number;
  setUnreadCount: (n: number) => void;
  pushNotification: (n: AppNotification) => void;
  clearLatest: () => void;
};
export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  latest: null,
  bumpVersion: 0,
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  pushNotification: (n) =>
    set((s) => ({
      latest: n,
      unreadCount: s.unreadCount + (n.unread ? 1 : 0),
      bumpVersion: s.bumpVersion + 1,
    })),
  clearLatest: () => set({ latest: null }),
}));
