'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared section title for settings: left icon tile (same as Open Source Sync) + title + description.
 * Use for every main settings tab so headers stay visually consistent.
 */
export function SettingsSectionHeading({
  icon,
  title,
  description,
  className,
}: Readonly<{
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div
        className="flex size-12 shrink-0 items-center justify-center border-2 border-border bg-foreground text-background shadow-[3px_3px_0px_0px_var(--primary)] [&_svg]:size-7"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-3xl font-black uppercase tracking-tighter">{title}</h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
