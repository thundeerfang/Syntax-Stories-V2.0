import type { ReactNode } from 'react';
import { cn } from '@/lib/core/utils';
import { Terminal } from 'lucide-react';

export type HeaderProps = {
  /** Route / module id in the shell bar (e.g. `System.Contact_Active`) */
  systemLabel: string;
  title: ReactNode;
  description?: ReactNode;
  /** Icon beside the title (e.g. message glyph) */
  titleIcon?: ReactNode;
  /** Blinking “Account context” chip in the shell when signed in */
  showAccountContext?: boolean;
  className?: string;
};

/**
 * Page hero: shell bar + main column (no version badge; no side rail / scanlines).
 */
export function Header({
  systemLabel,
  title,
  description,
  titleIcon,
  showAccountContext,
  className,
}: Readonly<HeaderProps>) {
  return (
    <header
      className={cn(
        /* No default margin-top — keeps top border aligned with siblings in grids (e.g. contact + Logistics). */
        'overflow-hidden border-4 border-border bg-card shadow',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 border-b-4 border-border bg-muted/40 px-4 py-3 sm:px-6">
        <span
          className="flex size-9 shrink-0 items-center justify-center border-2 border-border bg-card shadow"
          aria-hidden
        >
          <Terminal size={14} className="text-primary" strokeWidth={3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground">Route</p>
          <p className="truncate font-mono text-[11px] font-bold uppercase tracking-wide text-foreground">
            {systemLabel}
          </p>
        </div>

        {showAccountContext ? (
          <div className="ml-auto flex items-center gap-2 border-2 border-primary/50 bg-primary/10 px-2.5 py-1.5">
            <span className="size-2 shrink-0 animate-pulse bg-primary" aria-hidden />
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-primary">
              Account context
            </span>
          </div>
        ) : null}
      </div>

      <div className="px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="relative z-10 flex flex-col gap-5 sm:gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {titleIcon ? (
              <div className="mt-1 shrink-0 text-primary [&_svg]:size-9 sm:[&_svg]:size-11 md:[&_svg]:size-12" aria-hidden>
                {titleIcon}
              </div>
            ) : null}
            <h1 className="min-w-0 flex-1 text-3xl font-black uppercase italic leading-[0.9] tracking-tighter text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              {title}
            </h1>
          </div>
          {description ? (
            <div className="max-w-2xl border-l-4 border-primary/50 bg-muted/5 py-1 pl-5 pr-2 text-sm font-semibold leading-relaxed text-muted-foreground sm:pl-6 sm:text-base">
              {description}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
