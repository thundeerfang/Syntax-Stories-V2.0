'use client';

import { useState, useEffect } from 'react';
import { applyTheme, getEffectiveTheme, useThemeStore, type Theme } from '@/store/theme';
import { useShallow } from 'zustand/react/shallow';

function getEffectiveIsDark(theme: Theme): boolean {
  return getEffectiveTheme(theme) === 'dark';
}

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore(
    useShallow((s) => ({ theme: s.theme, setTheme: s.setTheme, toggleTheme: s.toggleTheme }))
  );
  const [isDark, setIsDark] = useState(() => getEffectiveIsDark(theme));

  useEffect(() => {
    const sync = () => {
      const effective = getEffectiveIsDark(theme);
      setIsDark(effective);
      applyTheme(theme);
    };
    sync();
    if (theme !== 'system') return;
    const mq = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => sync();
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  return { theme, setTheme, toggleTheme, isDark };
}
