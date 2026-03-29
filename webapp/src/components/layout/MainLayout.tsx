'use client';

import { useSidebar } from '@/hooks/useSidebar';
import { SidebarDrawer } from '@/components/layout/SidebarDrawer';
import { GridBackground } from '@/components/ui/grid-background';
import { cn } from '@/lib/utils';

export function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isOpen } = useSidebar();

  return (
    <main className="flex flex-1 min-h-0 border-t border-border bg-background">
      {/* Fixed left sidebar drawer */}
      <SidebarDrawer />

      {/* Main Content Area — shifts right when sidebar opens */}
      <div className={cn(
        "relative flex-1 min-h-0 overflow-hidden transition-all duration-300 ease-in-out",
        "border-l-2 border-border",
        "p-4 sm:p-6",
        isOpen ? "ml-60" : "ml-0"
      )}>
        {/* The Grid Effect */}
        <GridBackground />

        {/* The Actual Page Content */}
        <div className="relative z-[1] h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </main>
  );
}