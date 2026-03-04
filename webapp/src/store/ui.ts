'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const UI_STORAGE_KEY = 'syntax-stories-ui';

type UIState = {
  feedbackButtonVisible: boolean;
  setFeedbackButtonVisible: (visible: boolean) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      feedbackButtonVisible: true,
      setFeedbackButtonVisible: (visible) => set({ feedbackButtonVisible: visible }),
    }),
    { name: UI_STORAGE_KEY }
  )
);
