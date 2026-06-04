'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ColorMode = 'light' | 'dark';

const STORAGE_KEY = 'syntax-admin-color-mode';

type ColorModeContextValue = {
  mode: ColorMode;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

function getInitialMode(): ColorMode {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ColorMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialMode();
    setMode(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
    setMounted(true);
  }, []);

  const setColorMode = useCallback((next: ColorMode) => {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setColorMode]);

  const value = useMemo(
    () => ({ mode, toggleColorMode, setColorMode }),
    [mode, toggleColorMode, setColorMode]
  );

  return (
    <ColorModeContext.Provider value={value}>
      <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>{children}</div>
    </ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used within ColorModeProvider');
  return ctx;
}
