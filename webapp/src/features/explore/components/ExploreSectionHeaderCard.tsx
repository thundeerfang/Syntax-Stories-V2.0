'use client';

import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';


const EXPLORE_SECTION_HEADER_CARD =
  'w-full border-2 border-border bg-card p-4 shadow sm:p-5';

export function PanelSectionHeader({
  eyebrow,
  title,
  description,
}: Readonly<{ eyebrow: string; title: string; description?: string }>) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="h-[2px] w-6 bg-primary" />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
      </div>
      <h2 className="font-mono text-lg font-black uppercase tracking-tight text-foreground sm:text-xl">{title}</h2>
      {description ? (
        <p className="max-w-2xl text-[11px] font-mono uppercase leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function ExploreSectionHeaderCard({
  eyebrow,
  title,
  description,
  viewAllHref,
  viewAllLabel = 'View all',
  trailing,
}: Readonly<{
  eyebrow: string;
  title: string;
  description?: string;
  viewAllHref: string;
  viewAllLabel?: string;
  /** Renders inside the card beside “View all” (e.g. swiper arrows). */
  trailing?: ReactNode;
}>) {
  return (
    <div className={EXPLORE_SECTION_HEADER_CARD}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <PanelSectionHeader eyebrow={eyebrow} title={title} description={description} />
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">
          {trailing}
          <Button
            href={viewAllHref}
            variant="primary"
            size="sm"
            className="flex w-full shrink-0 justify-center font-mono text-[10px] font-black uppercase shadow-none sm:inline-flex sm:w-auto"
          >
            {viewAllLabel}
            <ArrowRight className="size-3.5 shrink-0" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
