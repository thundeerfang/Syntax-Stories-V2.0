'use client';

import Link from 'next/link';
import { OperationalStatusIndicator } from '@/components/layout/OperationalStatusIndicator';

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t-2 border-border bg-background py-6 sm:py-8">
      <div className="mx-auto max-w-[90rem] space-y-4 px-4 sm:px-8">
        {/* Row 1: brand + nav stack on narrow screens; status full width on mobile */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/"
              className="w-fit shrink-0 border-2 border-transparent px-2 text-sm font-black uppercase italic tracking-tighter text-foreground no-underline transition-all hover:border-primary"
            >
              Syntax_Stories
            </Link>
            <div className="hidden h-4 w-[2px] shrink-0 bg-border sm:block" />
            <nav className="flex min-w-0 flex-wrap gap-x-4 gap-y-2">
              {(
                [
                  { label: 'About', href: '/about' },
                  { label: 'Contact', href: '/contact' },
                  { label: 'Docs', href: '/docs' },
                ] as const
              ).map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="w-full min-w-0 border-t border-border pt-4 lg:w-auto lg:max-w-md lg:shrink-0 lg:border-t-0 lg:pt-0">
            <OperationalStatusIndicator />
          </div>
        </div>

        {/* Row 2: legal */}
        <div className="flex flex-col gap-4 border-t-2 border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-xs font-black uppercase tracking-widest text-muted-foreground">
            © {currentYear} Syntax_Stories_Corp // All_Rights_Reserved
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
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
          </div>
        </div>
      </div>
    </footer>
  );
}
