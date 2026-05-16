'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SquadCategoryLaneRow } from '@/components/squads/SquadCategoryLaneRow';
import { SquadsDiscoverFeaturedRail } from '@/components/squads/SquadsDiscoverFeaturedRail';
import { SQUAD_CATEGORIES } from '@/lib/squadCategory';
import { squadsApi, type SquadSummary } from '@/api/squads';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { toast } from 'sonner';

const FETCH_LIMIT = 200;

function mergeCatalog(publicSquads: SquadSummary[], mine: SquadSummary[]): SquadSummary[] {
  const byId = new Map<string, SquadSummary>();
  for (const s of publicSquads) byId.set(s._id, s);
  for (const s of mine) byId.set(s._id, s);
  return [...byId.values()];
}

/** `/squads/featured`: featured rail + squad lane rows. */
export function SquadsDiscoverFeaturedPageContent() {
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
    } catch {
      toast.error('Action failed');
    } finally {
      setJoinBusySlug(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-visible pb-24 md:gap-12">
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
