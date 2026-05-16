'use client';

import { Navbar } from './Navbar';
import { SidebarDrawer } from './SidebarDrawer';

/**
 * Navbar + sidebar in one sticky positioning context so the rail never detaches
 * from the header during scroll, resize, or membership-banner height changes.
 */
export function AppShellChrome() {
  return (
    <div className="sticky top-0 z-50 w-full shrink-0" data-app-shell-chrome>
      <Navbar />
      <SidebarDrawer />
    </div>
  );
}
