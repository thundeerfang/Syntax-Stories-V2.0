'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomFeedRules } from '@/lib/applyCustomFeedRules';

const STORAGE_KEY = 'syntax-stories-custom-feeds-v1';

/** Query value for `?feed=` meaning unfiltered catalog (even if a default custom feed exists). */
export const CUSTOM_FEED_EVERYTHING = 'everything' as const;

export type CustomFeedRow = Readonly<{
  id: string;
  name: string;
  iconEmoji: string;
  isDefault: boolean;
  rules: CustomFeedRules;
  createdAt: string;
}>;

function newId(): string {
  return `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const defaultRules = (): CustomFeedRules => ({
  tagSlugs: [],
  categorySlugs: [],
  userSources: [],
  squadSources: [],
  sort: 'newest',
  timeRange: 'all',
  minRespect: null,
  minRepost: null,
  minComment: null,
  minBookmark: null,
});

type CustomFeedsState = {
  feeds: CustomFeedRow[];
  newFeedDialogOpen: boolean;
  openNewFeedDialog: () => void;
  closeNewFeedDialog: () => void;
  addFeed: (input: {
    name: string;
    iconEmoji: string;
    isDefault: boolean;
    rules: CustomFeedRules;
  }) => string;
  removeFeed: (id: string) => void;
  setFeedDefault: (id: string) => void;
};

export const useCustomFeedsStore = create<CustomFeedsState>()(
  persist(
    (set) => ({
      feeds: [],
      newFeedDialogOpen: false,
      openNewFeedDialog: () => set({ newFeedDialogOpen: true }),
      closeNewFeedDialog: () => set({ newFeedDialogOpen: false }),
      addFeed: ({ name, iconEmoji, isDefault, rules }) => {
        const id = newId();
        const row: CustomFeedRow = {
          id,
          name: name.trim(),
          iconEmoji: iconEmoji.trim(),
          isDefault,
          rules,
          createdAt: new Date().toISOString(),
        };
        set((s) => {
          let feeds = s.feeds;
          if (isDefault) {
            feeds = feeds.map((f) => ({ ...f, isDefault: false }));
          }
          return { feeds: [...feeds, row] };
        });
        return id;
      },
      removeFeed: (id) =>
        set((s) => ({
          feeds: s.feeds.filter((f) => f.id !== id),
        })),
      setFeedDefault: (id) =>
        set((s) => ({
          feeds: s.feeds.map((f) => ({ ...f, isDefault: f.id === id })),
        })),
    }),
    { name: STORAGE_KEY, partialize: (s) => ({ feeds: s.feeds }) },
  ),
);

export function getDefaultFeedId(feeds: CustomFeedRow[]): string | null {
  const d = feeds.find((f) => f.isDefault);
  return d?.id ?? null;
}

export { defaultRules };
