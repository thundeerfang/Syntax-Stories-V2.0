'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const UI_STORAGE_KEY = 'syntax-stories-ui';

type UIState = {
  feedbackButtonVisible: boolean;
  setFeedbackButtonVisible: (visible: boolean) => void;
  /** Green/gray avatar status dot in navbar and account menu. */
  presenceIndicatorEnabled: boolean;
  setPresenceIndicatorEnabled: (enabled: boolean) => void;
  feedbackDialogOpen: boolean;
  setFeedbackDialogOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      feedbackButtonVisible: true,
      setFeedbackButtonVisible: (visible) => set({ feedbackButtonVisible: visible }),
      presenceIndicatorEnabled: true,
      setPresenceIndicatorEnabled: (enabled) => set({ presenceIndicatorEnabled: enabled }),
      feedbackDialogOpen: false,
      setFeedbackDialogOpen: (open) => set({ feedbackDialogOpen: open }),
    }),
    {
      name: UI_STORAGE_KEY,
      partialize: (s) => ({
        feedbackButtonVisible: s.feedbackButtonVisible,
        presenceIndicatorEnabled: s.presenceIndicatorEnabled,
      }),
    }
  )
);
