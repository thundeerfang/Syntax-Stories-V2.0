'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type DocsTheme = 'light' | 'dark';

type DocsThemeContextValue = {
  theme: DocsTheme;
  setTheme: (theme: DocsTheme) => void;
  toggleTheme: () => void;
  mounted: boolean;
};

const STORAGE_KEY = 'syntax-docs-theme';

const DocsThemeContext = createContext<DocsThemeContextValue | null>(null);

function readStoredTheme(): DocsTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch {
    return null;
  }
}

function systemTheme(): DocsTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeClass(theme: DocsTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function DocsThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DocsTheme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readStoredTheme() ?? systemTheme();
    setThemeState(initial);
    applyThemeClass(initial);
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: DocsTheme) => {
    setThemeState(next);
    applyThemeClass(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyThemeClass(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, mounted }),
    [theme, setTheme, toggleTheme, mounted]
  );

  return <DocsThemeContext.Provider value={value}>{children}</DocsThemeContext.Provider>;
}

export function useDocsTheme(): DocsThemeContextValue {
  const ctx = useContext(DocsThemeContext);
  if (!ctx) throw new Error('useDocsTheme must be used within DocsThemeProvider');
  return ctx;
}
