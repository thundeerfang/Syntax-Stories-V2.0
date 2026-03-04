'use client';

import { useState, useEffect } from 'react';
import { useThemeStore } from '@/store/theme';
import { useShallow } from 'zustand/react/shallow';

function getEffectiveIsDark(theme: 'light' | 'dark' | 'system'): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore(
    useShallow((s) => ({ theme: s.theme, setTheme: s.setTheme, toggleTheme: s.toggleTheme }))
  );
  const [isDark, setIsDark] = useState(() => getEffectiveIsDark(theme));

  useEffect(() => {
    const effective = getEffectiveIsDark(theme);
    setIsDark(effective);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setIsDark(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  return { theme, setTheme, toggleTheme, isDark };
}
