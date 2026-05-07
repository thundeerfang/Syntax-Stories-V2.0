'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const THEME_KEY = 'syntax-stories-theme';

export type Theme = 'light' | 'dark' | 'system';

type ThemeState = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system' && globalThis.window !== undefined) {
    return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'system' ? 'light' : theme;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const effective = getEffectiveTheme(theme);
  document.documentElement.classList.toggle('dark', effective === 'dark');
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (t) => {
        set({ theme: t });
        applyTheme(t);
      },
      toggleTheme: () => {
        const current = get().theme;
        const effective = getEffectiveTheme(current);
        const next: Theme = effective === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyTheme(next);
      },
    }),
    {
      name: THEME_KEY,
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    }
  )
);
