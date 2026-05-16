'use client';

/** Squads featured discover — owned by features/squads (thin route: app/squads/featured/page.tsx). */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { squadsApi, type SquadSummary } from '@/api/squads';
import { ExploreSectionHeaderCard } from '@/features/explore';
import { SquadDiscoverCard } from '../components/SquadDiscoverCard';
import { SquadDirectoryCard } from '../components/SquadDirectoryCard';
import { type SquadCategory, SQUAD_CATEGORIES, squadCategoryLabel } from '@/lib/squads/squadCategory';
import { SQUAD_DISCOVER_CARD_SLIDE_CLASS } from '@/lib/squads/squadDiscoverCardLayout';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { toast } from 'sonner';

function getScrollStridePx(scroller: HTMLDivElement): number {
  const a = scroller.children.item(0) as HTMLElement | null;
  const b = scroller.children.item(1) as HTMLElement | null;
  if (a && b) return b.offsetLeft - a.offsetLeft;
  if (a) return a.offsetWidth;
  return 0;
}

type SquadCategoryLaneRowProps = Readonly<{
  category: SquadCategory;
  squads: SquadSummary[];
  isMember: (s: SquadSummary) => boolean;
  joinBusySlug: string | null;
  onJoin: (slug: string) => void;
  onEditSquad?: (s: SquadSummary) => void;
  token: string | null;
}>;

/** “Squad lane · {Category}” horizontal row; View all → category detail page. */
function SquadCategoryLaneRow({
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

const RETRO_SHADOW_SM =
  'shadow active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all';

function NavChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'relative shrink-0  border-2 border-border bg-background px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest',
        'text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground',
        RETRO_SHADOW_SM,
      )}
    >
      {label}
    </Link>
  );
}

type SquadsDiscoverFeaturedRailProps = Readonly<{
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
function SquadsDiscoverFeaturedRail({
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

          <div className="flex items-center gap-0 border-2 border-border bg-background p-0 shadow">
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
              <SquadDiscoverCard
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

const FETCH_LIMIT = 200;

function mergeCatalog(publicSquads: SquadSummary[], mine: SquadSummary[]): SquadSummary[] {
  const byId = new Map<string, SquadSummary>();
  for (const s of publicSquads) byId.set(s._id, s);
  for (const s of mine) byId.set(s._id, s);
  return [...byId.values()];
}

/** `/squads/featured`: featured rail + squad lane rows. */
export function SquadsFeaturedPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const openAuth = useAuthDialogStore((s) => s.open);

  const [publicSquads, setPublicSquads] = useState<SquadSummary[]>([]);
  const [mine, setMine] = useState<SquadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinBusySlug, setJoinBusySlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pub, m] = await Promise.all([
        squadsApi.listPublic({ limit: FETCH_LIMIT }),
        token ? squadsApi.listMine(token) : Promise.resolve({ squads: [] }),
      ]);
      setPublicSquads(pub.squads);
      setMine(m.squads);
    } catch {
      toast.error('Sync failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const merged = useMemo(() => mergeCatalog(publicSquads, mine), [publicSquads, mine]);
  const isMember = useCallback((s: SquadSummary) => s.viewerRole != null, []);

  const handleJoin = async (slug: string) => {
    if (!token) return openAuth('login');
    setJoinBusySlug(slug);
    try {
      await squadsApi.join(slug, token);
      toast.success('Joined');
      await load();
    } catch (e) {
      toast.error('Action failed');
      throw e;
    } finally {
      setJoinBusySlug(null);
    }
  };

  return (
    <div
      className={cn(
        SHELL_CONTENT_RAIL_CLASS,
        'flex min-h-0 flex-1 flex-col gap-10 overflow-visible pb-24 md:gap-12',
      )}
    >
      <SquadsDiscoverFeaturedRail
        squads={merged}
        loading={loading}
        isMember={isMember}
        joinBusySlug={joinBusySlug}
        onJoin={handleJoin}
      />

      {!loading ? (
        <div className="space-y-24 pt-12">
          {SQUAD_CATEGORIES.map((c) => {
            const items = merged.filter((s) => s.category === c && s.visibility === 'public');
            if (items.length === 0) return null;
            return (
              <SquadCategoryLaneRow
                key={c}
                category={c}
                squads={items.slice(0, 12)}
                isMember={isMember}
                joinBusySlug={joinBusySlug}
                onJoin={handleJoin}
                onEditSquad={(s) => router.push(`/squads/${encodeURIComponent(s.slug)}`)}
                token={token}
              />
            );
          })}
        </div>
      ) : (
        <div
          className="h-40 w-full animate-pulse border-2 border-border bg-muted/20"
          aria-busy="true"
          aria-label="Loading squad lanes"
        />
      )}
    </div>
  );
}
