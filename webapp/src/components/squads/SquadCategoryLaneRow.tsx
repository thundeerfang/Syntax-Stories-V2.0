'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ExploreSectionHeaderCard } from '@/components/explore/ExploreSectionHeaderCard';
import { SquadDirectoryCard } from '@/components/squads/SquadDirectoryCard';
import { type SquadCategory, squadCategoryLabel } from '@/lib/squadCategory';
import { SQUAD_DISCOVER_CARD_SLIDE_CLASS } from '@/lib/squadDiscoverCardLayout';
import type { SquadSummary } from '@/api/squads';

function getScrollStridePx(scroller: HTMLDivElement): number {
  const a = scroller.children.item(0) as HTMLElement | null;
  const b = scroller.children.item(1) as HTMLElement | null;
  if (a && b) return b.offsetLeft - a.offsetLeft;
  if (a) return a.offsetWidth;
  return 0;
}

export type SquadCategoryLaneRowProps = Readonly<{
  category: SquadCategory;
  squads: SquadSummary[];
  isMember: (s: SquadSummary) => boolean;
  joinBusySlug: string | null;
  onJoin: (slug: string) => void;
  onEditSquad?: (s: SquadSummary) => void;
  token: string | null;
}>;

/** “Squad lane · {Category}” horizontal row; View all → category detail page. */
export function SquadCategoryLaneRow({
  category,
  squads,
  isMember,
  joinBusySlug,
  onJoin,
  onEditSquad,
  token,
}: SquadCategoryLaneRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const n = squads.length;

  const scrollByStep = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * getScrollStridePx(el), behavior: 'smooth' });
  };

  const label = squadCategoryLabel(category);
  const seeAllHref = `/squads/${encodeURIComponent(category)}`;

  return (
    <section className="group space-y-4">
      <ExploreSectionHeaderCard
        eyebrow="Squad lane"
        title={label}
        viewAllHref={seeAllHref}
        viewAllLabel="View all"
        trailing={
          n > 1 ? (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label={`Scroll ${label} left`}
                onClick={() => scrollByStep(-1)}
                className="border-2 border-border bg-background p-2 text-foreground transition-colors hover:border-primary"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Scroll ${label} right`}
                onClick={() => scrollByStep(1)}
                className="border-2 border-border bg-background p-2 text-foreground transition-colors hover:border-primary"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          ) : null
        }
      />

      <div className="relative">
        <div ref={scrollerRef} className="ss-scrollbar-hide flex flex-nowrap gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth">
          {squads.map((s) => (
            <div key={s._id} className={SQUAD_DISCOVER_CARD_SLIDE_CLASS}>
              <SquadDirectoryCard
                squad={s}
                isMember={isMember(s)}
                isAdmin={s.viewerRole === 'admin'}
                joinBusy={joinBusySlug === s.slug}
                onJoin={onJoin}
                onEditSquad={token && s.viewerRole === 'admin' && onEditSquad ? () => onEditSquad(s) : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
