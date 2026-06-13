'use client';

/**
 * Squad slug route helpers (P3) — SquadMembersDialog + category browse view.
 * Co-located with app/squads/[slug]/page.tsx.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { squadsApi, type SquadSummary } from '@/api/squads';
import { ShellPageIntroHeader } from '@/components/layout';
import { SquadDirectoryCard } from '@/features/squads';
import { isSquadCategory, squadCategoryLabel } from '@/lib/squads/squadCategory';
import { SQUAD_DISCOVER_CARD_GRID_CLASS } from '@/lib/squads/squadDiscoverCardLayout';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { toast } from 'sonner';

export {
  SquadMembersDialog,
  type SquadMembersDialogRow,
} from './SquadMembersDialog';

const FETCH_LIMIT = 200;

function mergeCatalog(publicSquads: SquadSummary[], mine: SquadSummary[]): SquadSummary[] {
  const byId = new Map<string, SquadSummary>();
  for (const s of publicSquads) byId.set(s._id, s);
  for (const s of mine) byId.set(s._id, s);
  return [...byId.values()];
}

export function SquadsDiscoverCategoryView({ categoryParam }: Readonly<{ categoryParam: string }>) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const openAuth = useAuthDialogStore((s) => s.open);
  const decoded = decodeURIComponent(categoryParam);
  const category = isSquadCategory(decoded) ? decoded : null;

  const [publicSquads, setPublicSquads] = useState<SquadSummary[]>([]);
  const [mine, setMine] = useState<SquadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinBusySlug, setJoinBusySlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pub = await squadsApi.listPublic({ limit: FETCH_LIMIT });
      setPublicSquads(pub.squads);
      if (token) {
        const m = await squadsApi.listMine(token);
        setMine(m.squads);
      } else {
        setMine([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load squads');
      setPublicSquads([]);
      setMine([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const merged = useMemo(() => mergeCatalog(publicSquads, mine), [publicSquads, mine]);

  const rows = useMemo(() => {
    if (!category) return [];
    return [...merged]
      .filter((s) => s.visibility === 'public' && s.category === category)
      .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name));
  }, [merged, category]);

  const isMember = useCallback((s: SquadSummary) => s.viewerRole != null, []);

  const handleCardJoin = async (squadSlug: string): Promise<boolean> => {
    const row = merged.find((x) => x.slug === squadSlug);
    if (!row) return false;
    if (!token) {
      openAuth('login');
      return false;
    }
    if (row.visibility === 'private') {
      router.push(`/squads/${encodeURIComponent(squadSlug)}`);
      return false;
    }
    setJoinBusySlug(squadSlug);
    try {
      await squadsApi.join(squadSlug, token);
      toast.success('Joined squad');
      await load();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not join');
      throw e;
    } finally {
      setJoinBusySlug(null);
    }
  };

  if (!category) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6 pt-1 md:pt-2">
        <ShellPageIntroHeader
          breadcrumbItems={[
            { href: '/', label: 'Home' },
            { href: '/squads', label: 'Squads' },
            { label: 'Unknown category' },
          ]}
          title={
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Unknown category</h1>
          }
          description="That category path is not valid. Open squads or featured to browse."
        />
        <Link
          href="/squads"
          className="inline-flex w-fit border-2 border-border bg-primary px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wide text-primary-foreground hover:opacity-90"
        >
          Open squads
        </Link>
      </div>
    );
  }

  const title = squadCategoryLabel(category);

  const titleUpper = title.toUpperCase();

  const breadcrumbItems = [
    { href: '/', label: 'Home' },
    { href: '/squads', label: 'Squads' },
    { label: `${titleUpper} squads` },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 pt-1 md:gap-8 md:pt-2">
      <ShellPageIntroHeader
        breadcrumbItems={breadcrumbItems}
        title={
          <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tracking-tight">
            <span className="font-black uppercase text-foreground text-3xl sm:text-4xl lg:text-[2.5rem]">
              {titleUpper}
            </span>
            <span className="font-mono text-base font-bold uppercase tracking-[0.12em] text-primary sm:text-lg">
              squads
            </span>
          </h1>
        }
        description="Every public squad in this category. Sign in to join from a card, or open a squad to read its feed."
      />

      <section className="space-y-3" aria-label={`${title} squads`}>
        <h2 className="font-mono text-xs font-black uppercase tracking-wide text-muted-foreground">
          All squads in {title} ({rows.length})
        </h2>
        {loading ? (
          <ul className={SQUAD_DISCOVER_CARD_GRID_CLASS}>
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i}>
                <div className="min-h-[17rem] w-full animate-pulse border-2 border-border bg-muted/25 shadow" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="border-2 border-dashed border-border bg-muted/10 px-4 py-10 text-center font-mono text-xs uppercase text-muted-foreground">
            No public squads in {title} yet.
          </p>
        ) : (
          <ul className={SQUAD_DISCOVER_CARD_GRID_CLASS}>
            {rows.map((s) => (
              <li key={s._id} className="flex min-h-0">
                <SquadDirectoryCard
                  squad={s}
                  isMember={isMember(s)}
                  isAdmin={s.viewerRole === 'admin'}
                  joinBusy={joinBusySlug === s.slug}
                  onJoin={handleCardJoin}
                  onEditSquad={
                    token && s.viewerRole === 'admin'
                      ? () => router.push(`/squads/${encodeURIComponent(s.slug)}`)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
