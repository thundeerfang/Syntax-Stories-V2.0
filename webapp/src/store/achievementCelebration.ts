"use client";
import { create } from "zustand";
import type { AchievementUnlockDto } from "@/contracts/achievementsApi";
const SEEN_CAP = 200;
type AchievementCelebrationState = {
  queue: AchievementUnlockDto[];
  active: AchievementUnlockDto | null;
  seenIds: Set<string>;
  enqueue: (unlocks: AchievementUnlockDto[]) => void;
  showNext: () => void;
  dismissActive: () => void;
};
function filterNewUnlocks(
  unlocks: AchievementUnlockDto[],
  seen: Set<string>,
): {
  fresh: AchievementUnlockDto[];
  seen: Set<string>;
} {
  const nextSeen = new Set(seen);
  const fresh: AchievementUnlockDto[] = [];
  for (const u of unlocks) {
    if (!u.id || nextSeen.has(u.id)) continue;
    nextSeen.add(u.id);
    fresh.push(u);
    if (nextSeen.size > SEEN_CAP) {
      const iter = nextSeen.values();
      nextSeen.delete(iter.next().value as string);
    }
  }
  return { fresh, seen: nextSeen };
}
export const useAchievementCelebrationStore =
  create<AchievementCelebrationState>((set, get) => ({
    queue: [],
    active: null,
    seenIds: new Set<string>(),
    enqueue: (unlocks) => {
      if (!unlocks.length) return;
      const state = get();
      const { fresh, seen } = filterNewUnlocks(
        unlocks.filter((u) => u.celebrateAs === "dialog"),
        state.seenIds,
      );
      if (!fresh.length) return;
      if (!state.active) {
        set({ active: fresh[0], queue: fresh.slice(1), seenIds: seen });
        return;
      }
      set({ queue: [...state.queue, ...fresh], seenIds: seen });
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
export function celebrateAchievements(
  unlocks: AchievementUnlockDto[] | undefined,
): void {
  if (!unlocks?.length) return;
  useAchievementCelebrationStore.getState().enqueue(unlocks);
}
