'use client';

import { create } from 'zustand';
import type { AchievementUnlockDto } from '@/contracts/achievementsApi';

type AchievementCelebrationState = {
  queue: AchievementUnlockDto[];
  active: AchievementUnlockDto | null;
  enqueue: (unlocks: AchievementUnlockDto[]) => void;
  showNext: () => void;
  dismissActive: () => void;
};

export const useAchievementCelebrationStore = create<AchievementCelebrationState>((set, get) => ({
  queue: [],
  active: null,
  enqueue: (unlocks) => {
    if (!unlocks.length) return;
    const state = get();
    if (!state.active) {
      set({ active: unlocks[0], queue: unlocks.slice(1) });
      return;
    }
    set({ queue: [...state.queue, ...unlocks] });
  },
  showNext: () => {
    const { queue } = get();
    if (queue.length === 0) {
      set({ active: null });
      return;
    }
    const [next, ...rest] = queue;
    set({ active: next, queue: rest });
  },
  dismissActive: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      set({ active: next, queue: rest });
    } else {
      set({ active: null });
    }
  },
}));

/** Push server-returned unlocks into the celebration queue. */
export function celebrateAchievements(unlocks: AchievementUnlockDto[] | undefined): void {
  if (!unlocks?.length) return;
  useAchievementCelebrationStore.getState().enqueue(unlocks);
}
