'use client';

import Link from 'next/link';
import { useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { FeaturedSquadCard } from '@/components/squads/FeaturedSquadCard';
import { SQUAD_DISCOVER_CARD_SLIDE_CLASS } from '@/lib/squadDiscoverCardLayout';
import { SQUAD_CATEGORIES, squadCategoryLabel } from '@/lib/squadCategory';
import { cn } from '@/lib/utils';
import type { SquadSummary } from '@/api/squads';

const RETRO_SHADOW_SM =
  'shadow-[3px_3px_0_0_var(--border)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all';

function NavChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'relative shrink-0 rounded-none border-2 border-border bg-background px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest',
        'text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground',
        RETRO_SHADOW_SM,
      )}
    >
      {label}
    </Link>
  );
}

export type SquadsDiscoverFeaturedRailProps = Readonly<{
  squads: SquadSummary[];
  loading: boolean;
  isMember: (s: SquadSummary) => boolean;
  joinBusySlug: string | null;
  onJoin: (slug: string) => void;
}>;

/**
 * Featured + Elite Squads Network + category badges + horizontal featured cards.
 * Used on `/squads/featured` above the per-category squad lane rows.
 */
export function SquadsDiscoverFeaturedRail({
  squads,
  loading,
  isMember,
  joinBusySlug,
  onJoin,
}: SquadsDiscoverFeaturedRailProps) {
  /** All public squads, largest first — rail scrolls horizontally (not one full-viewport slide). */
  const items = useMemo(
    () =>
      [...squads]
        .filter((s) => s.visibility === 'public')
        .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name)),
    [squads],
  );
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div
        className="mb-12 h-52 w-full animate-pulse border-2 border-border bg-muted/25"
        aria-busy="true"
        aria-label="Loading featured squads"
      />
    );
  }

  return (
    <section className="relative isolate mb-20 w-full overflow-visible border-2 border-border bg-card sm:mb-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_75%_at_50%_100%,color-mix(in_srgb,var(--primary)_32%,transparent)_0%,transparent_65%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[color-mix(in_srgb,var(--primary)_14%,transparent)]"
        aria-hidden
      />

      <div className="relative z-10 overflow-visible px-4 pb-32 pt-8 sm:pb-36 md:px-6 md:pb-40 md:pt-10">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-11 shrink-0 items-center justify-center border-2 border-primary bg-background text-primary sm:size-12',
                RETRO_SHADOW_SM,
              )}
            >
              <Sparkles className="size-5 sm:size-6" strokeWidth={2.25} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="font-mono text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">Featured</h1>
              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Elite Squads Network
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0 border-2 border-border bg-background p-0 shadow-[3px_3px_0_0_var(--border)]">
            <button
              type="button"
              aria-label="Scroll featured squads left"
              onClick={() => scrollerRef.current?.scrollBy({ left: -400, behavior: 'smooth' })}
              className="border-r-2 border-border p-2.5 text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
            >
              <ChevronLeft className="size-5 sm:size-6" strokeWidth={2.25} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Scroll featured squads right"
              onClick={() => scrollerRef.current?.scrollBy({ left: 400, behavior: 'smooth' })}
              className="p-2.5 text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
            >
              <ChevronRight className="size-5 sm:size-6" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>

        <nav
          className="ss-scrollbar-hide mt-4 flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] md:mt-5"
          aria-label="Squad categories"
        >
          {SQUAD_CATEGORIES.map((c) => (
            <NavChip key={c} label={squadCategoryLabel(c)} href={`/squads/${encodeURIComponent(c)}`} />
          ))}
        </nav>
      </div>

      <div
        ref={scrollerRef}
        className={cn(
          'ss-scrollbar-hide pointer-events-auto absolute inset-x-0 bottom-0 z-20',
          'flex w-full snap-x snap-mandatory scroll-smooth gap-3 overflow-x-auto px-3 pb-1 pt-1 sm:gap-4 sm:px-4 md:px-6',
          'translate-y-1/2',
        )}
      >
        {items.length === 0 ? (
          <p className="w-full px-2 py-6 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            No public squads yet
          </p>
        ) : (
          items.map((squad) => (
            <div
              key={squad._id}
              className={cn(
                SQUAD_DISCOVER_CARD_SLIDE_CLASS,
                'flex items-end justify-center self-stretch',
              )}
            >
              <FeaturedSquadCard
                squad={squad}
                isMember={isMember(squad)}
                joinBusy={joinBusySlug === squad.slug}
                onJoin={onJoin}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
