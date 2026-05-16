'use client';

import Link from 'next/link';
import { OperationalStatusIndicator } from '@/components/layout/OperationalStatusIndicator';
import { useSidebar } from '@/hooks/useSidebar';
import { SHELL_RAIL_FROST_CLASS, SHELL_RAIL_FROST_STYLE } from '@/lib/shellContentRail';
import { cn } from '@/lib/utils';

const currentYear = new Date().getFullYear();

export function Footer() {
  const { isOpen } = useSidebar();

  return (
    <footer
      id="app-footer"
      className={cn(
        'relative z-10 overflow-hidden border-t-2 border-border py-6 sm:py-8',
        'transition-[margin-left,width] duration-300 ease-in-out',
        isOpen ? 'ml-60 w-[calc(100%-15rem)]' : 'ml-[52px] w-[calc(100%-52px)]',
      )}
    >
      <div
        aria-hidden
        className={cn(SHELL_RAIL_FROST_CLASS, 'pointer-events-none absolute inset-0 z-0')}
        style={SHELL_RAIL_FROST_STYLE}
      />
      <div className="relative z-[1] mx-auto max-w-[90rem] px-4 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-xs font-black uppercase tracking-widest text-muted-foreground">
            © {currentYear} Syntax_Stories_Corp // All_Rights_Reserved
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/terms"
              className="text-xs font-black uppercase tracking-widest text-muted-foreground underline-offset-4 decoration-2 hover:text-primary hover:underline"
            >
              Terms.txt
            </Link>
            <Link
              href="/privacy"
              className="text-xs font-black uppercase tracking-widest text-muted-foreground underline-offset-4 decoration-2 hover:text-primary hover:underline"
            >
              Privacy.txt
            </Link>
            <Link
              href="/user-data-deletion"
              className="text-xs font-black uppercase tracking-widest text-muted-foreground underline-offset-4 decoration-2 hover:text-primary hover:underline"
            >
              UDD.txt
            </Link>
            <OperationalStatusIndicator />
          </div>
        </div>
      </div>
    </footer>
  );
}
