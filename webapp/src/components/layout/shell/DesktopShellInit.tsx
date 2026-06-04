'use client';

import { useEffect } from 'react';
import { getDesktopPlatform, isDesktopShell } from '@/lib/desktop/isDesktop';
import { attachSystemThemeListener, useThemeStore } from '@/store/theme';
import { useSidebarStore } from '@/store/sidebar';

/** Applies document-level desktop shell attributes and default sidebar state. */
export function DesktopShellInit() {
  useEffect(() => {
    attachSystemThemeListener();

    if (!isDesktopShell()) return;

    useThemeStore.getState().setTheme('system');

    const root = document.documentElement;
    root.dataset.desktopShell = 'true';
    const platform = getDesktopPlatform();
    if (platform) root.dataset.platform = platform;

    useSidebarStore.getState().close();

    return () => {
      delete root.dataset.desktopShell;
      delete root.dataset.platform;
    };
  }, []);

  return null;
}
