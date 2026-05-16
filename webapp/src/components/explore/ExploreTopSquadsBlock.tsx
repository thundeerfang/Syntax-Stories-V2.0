'use client';

import { useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SquadDirectoryCard } from '@/components/squads/SquadDirectoryCard';
import { RailSectionSubheader } from '@/components/layout/RailSectionSubheader';
import { SQUAD_DISCOVER_CARD_SLIDE_CLASS } from '@/lib/squadDiscoverCardLayout';
import { cn } from '@/lib/utils';
import type { SquadSummary } from '@/api/squads';

function getScrollStridePx(scroller: HTMLDivElement): number {
  const a = scroller.children.item(0) as HTMLElement | null;
  const b = scroller.children.item(1) as HTMLElement | null;
  if (a && b) return b.offsetLeft - a.offsetLeft;
  if (a) return a.offsetWidth;
  return 0;
}

const laneToolbarBtn =
  'inline-flex h-[42px] shrink-0 items-center justify-center border-2 border-border bg-background font-mono text-[10px] font-black uppercase tracking-widest text-foreground transition-colors hover:bg-muted/50';

export type ExploreTopSquadsBlockProps = Readonly<{
  squads: SquadSummary[];
  loading: boolean;
  joinBusySlug: string | null;
  onJoin: (slug: string) => void | Promise<void>;
}>;

export function ExploreTopSquadsBlock({
  squads,
  loading,
  joinBusySlug,
  onJoin,
}: ExploreTopSquadsBlockProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const n = squads.length;

  const scrollByStep = useCallback(
    (dir: -1 | 1) => {
      const el = scrollerRef.current;
      if (!el) return;
      const stride = getScrollStridePx(el);
      if (stride <= 0) return;
      el.scrollBy({ left: dir * stride, behavior: 'smooth' });
    },
    [],
  );

  const showArrows = !loading && n > 1;

  return (
    <section className="space-y-4">
      <RailSectionSubheader
        text={
          loading
            ? 'Top squads'
            : n > 0
              ? `Top squads · ${n} ${n === 1 ? 'squad' : 'squads'}`
              : 'Top squads'
        }
        buttons={[
          {
            label: 'View all',
            href: '/squads/featured',
            variant: 'primary',
          },
        ]}
        swiperButtons={
          showArrows ? (
            <>
              <button
                type="button"
                aria-label="Scroll squads left"
                onClick={() => scrollByStep(-1)}
                className={cn(laneToolbarBtn, 'w-10 p-0')}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Scroll squads right"
                onClick={() => scrollByStep(1)}
                className={cn(laneToolbarBtn, 'w-10 p-0')}
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </>
          ) : null
        }
      />

      {loading ? (
        <div
          className="ss-scrollbar-hide flex w-full min-w-0 flex-nowrap gap-4 overflow-x-hidden pb-1"
          aria-busy="true"
          aria-label="Loading squads"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className={cn(
                SQUAD_DISCOVER_CARD_SLIDE_CLASS,
                'h-[17.5rem] shrink-0 animate-pulse border-2 border-border bg-muted/25 shadow-[3px_3px_0_0_var(--border)]',
              )}
            />
          ))}
        </div>
      ) : n === 0 ? (
        <p className="border-2 border-dashed border-border bg-muted/10 px-4 py-8 text-center font-mono text-xs uppercase text-muted-foreground">
          No public squads yet — create one from Squads.
        </p>
      ) : (
        <div
          ref={scrollerRef}
          className={cn(
            'ss-scrollbar-hide flex w-full min-w-0 flex-nowrap gap-4 overflow-x-auto pb-1',
            'snap-x snap-mandatory scroll-smooth',
          )}
          role="region"
          aria-label="Top squads"
        >
          {squads.map((s) => (
            <div key={s._id} className={SQUAD_DISCOVER_CARD_SLIDE_CLASS}>
              <SquadDirectoryCard
                squad={s}
                isMember={s.viewerRole != null}
                isAdmin={s.viewerRole === 'admin'}
                joinBusy={joinBusySlug === s.slug}
                onJoin={onJoin}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
