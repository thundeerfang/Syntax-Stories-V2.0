'use client';

import { create } from 'zustand';
import type { AlertStatus } from '@/components/retroui/Alert';

export type ToastItem = {
  id: string;
  status: AlertStatus;
  title: string;
  duration?: number;
  createdAt: number;
};

type ToastState = {
  toasts: ToastItem[];
  add: (opts: { status: AlertStatus; title: string; duration?: number }) => void;
  remove: (id: string) => void;
  success: (title: string, duration?: number) => void;
  info: (title: string, duration?: number) => void;
  error: (title: string, duration?: number) => void;
  warning: (title: string, duration?: number) => void;
};

let idCounter = 0;
const genId = () => `toast-${++idCounter}-${Date.now()}`;

const DEFAULT_DURATION = 5000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  add: (opts) => {
    const id = genId();
    const toast: ToastItem = {
      id,
      status: opts.status,
      title: opts.title,
      duration: opts.duration ?? DEFAULT_DURATION,
      createdAt: Date.now(),
    };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    const duration = opts.duration ?? DEFAULT_DURATION;
    if (duration > 0) {
      setTimeout(() => {
        get().remove(id);
      }, duration);
    }
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  success: (title, duration) => get().add({ status: 'success', title, duration }),
  info: (title, duration) => get().add({ status: 'info', title, duration }),
  error: (title, duration) => get().add({ status: 'error', title, duration }),
  warning: (title, duration) => get().add({ status: 'warning', title, duration }),
}));
