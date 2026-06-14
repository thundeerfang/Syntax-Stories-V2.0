"use client";
import { create } from "zustand";
type UiProcessingLockState = {
  depth: number;
  begin: () => void;
  end: () => void;
};
export const useUiProcessingLockStore = create<UiProcessingLockState>(
  (set) => ({
    depth: 0,
    begin: () => set((s) => ({ depth: s.depth + 1 })),
    end: () => set((s) => ({ depth: Math.max(0, s.depth - 1) })),
  }),
);
export async function withUiProcessingLock<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const { begin, end } = useUiProcessingLockStore.getState();
  begin();
  try {
    return await fn();
  } finally {
    end();
  }
}
