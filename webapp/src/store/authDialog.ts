'use client';

import { create } from 'zustand';

export type AuthDialogView = 'login' | 'signup';

type AuthDialogState = {
  isOpen: boolean;
  initialView: AuthDialogView;
  open: (view?: AuthDialogView) => void;
  close: () => void;
};

export const useAuthDialogStore = create<AuthDialogState>((set) => ({
  isOpen: false,
  initialView: 'login',
  open: (view = 'login') => set({ isOpen: true, initialView: view }),
  close: () => set({ isOpen: false }),
}));
