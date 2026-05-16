'use client';

import { Navbar } from '../nav/Navbar';
import { SidebarDrawer } from '../nav/SidebarDrawer';

/** Navbar + sidebar share one sticky context so the rail never detaches from the header. */
export function AppShellChrome() {
  return (
    <div className="sticky top-0 z-50 w-full shrink-0" data-app-shell-chrome>
      <Navbar />
      <SidebarDrawer />
    </div>
  );
}
