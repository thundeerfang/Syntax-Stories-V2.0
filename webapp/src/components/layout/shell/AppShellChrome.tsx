'use client';

import { useDesktopShell } from '@/hooks/useDesktopShell';
import { Navbar } from '../nav/Navbar';
import { SidebarDrawer } from '../nav/SidebarDrawer';
import { DesktopTitleBar } from './DesktopTitleBar';

/** Navbar + sidebar share one sticky context so the rail never detaches from the header. */
export function AppShellChrome() {
  const isDesktop = useDesktopShell();

  return (
    <div className="sticky top-0 z-50 w-full shrink-0" data-app-shell-chrome>
      {isDesktop ? <DesktopTitleBar /> : <Navbar />}
      <SidebarDrawer />
    </div>
  );
}
