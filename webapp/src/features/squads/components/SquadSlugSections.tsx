'use client';

/**
 * Squad slug route helpers (P3) — SquadMembersDialog + category browse view.
 * Co-located with app/squads/[slug]/page.tsx.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Search, UsersRound } from 'lucide-react';
import { followApi } from '@/api/follow';
import { squadsApi, type SquadMemberRole, type SquadSummary } from '@/api/squads';
import { ShellPageIntroHeader } from '@/components/layout';
import { SquadDirectoryCard } from '@/features/squads';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/dialog';
import { isSquadCategory, squadCategoryLabel } from '@/lib/squads/squadCategory';
import { SQUAD_DISCOVER_CARD_GRID_CLASS } from '@/lib/squads/squadDiscoverCardLayout';
import { cn } from '@/lib/core/utils';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { toast } from 'sonner';

export type SquadMembersDialogRow = {
  userId: string;
  username: string;
  fullName: string;
  profileImg: string;
  role: SquadMemberRole;
};

function memberAvatarSrc(profileImg: string | undefined, username: string): string {
  const trimmed = profileImg?.trim();
  if (!trimmed) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return `${base.replace(/\/$/, '')}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function roleLabel(role: SquadMemberRole): string {
  if (role === 'admin') return 'Admin';
  if (role === 'moderator') return 'Moderator';
  return 'Member';
}

export function SquadMembersDialog({
  open,
  onClose,
  members,
  accessToken,
  myUsername,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  members: SquadMembersDialogRow[];
  accessToken: string | null;
  myUsername: string | null | undefined;
}>) {
  const titleId = useId();
  const [q, setQ] = useState('');
  const [followingByUser, setFollowingByUser] = useState<Record<string, boolean>>({});
  const [busyUser, setBusyUser] = useState<string | null>(null);

  const me = myUsername?.trim().toLowerCase() ?? '';

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  useEffect(() => {
    if (!open || !accessToken) {
      setFollowingByUser({});
      return;
    }
    let cancelled = false;
    const others = members.filter((m) => m.username.toLowerCase() !== me);
    void (async () => {
      const entries = await Promise.all(
        others.map(async (m) => {
          try {
            const r = await followApi.checkFollowing(m.username, accessToken);
            return [m.username, r.following === true] as const;
          } catch {
            return [m.username, false] as const;
          }
        }),
      );
      if (!cancelled) setFollowingByUser(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, accessToken, members, me]);

  const ql = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!ql) return members;
    return members.filter((m) => {
      const hay = `${m.username} ${m.fullName}`.toLowerCase();
      return hay.includes(ql);
    });
  }, [members, ql]);

  const staff = useMemo(
    () => filtered.filter((m) => m.role === 'admin' || m.role === 'moderator'),
    [filtered],
  );
  const regular = useMemo(() => filtered.filter((m) => m.role === 'member'), [filtered]);

  const toggleFollow = useCallback(
    async (username: string) => {
      if (!accessToken) {
        toast.error('Sign in to follow');
        return;
      }
      setBusyUser(username);
      try {
        const isFollowing = followingByUser[username] === true;
        if (isFollowing) {
          await followApi.unfollow(username, accessToken);
          setFollowingByUser((prev) => ({ ...prev, [username]: false }));
          toast.success('Unfollowed');
        } else {
          await followApi.follow(username, accessToken);
          setFollowingByUser((prev) => ({ ...prev, [username]: true }));
          toast.success('Following');
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update follow');
      } finally {
        setBusyUser(null);
      }
    },
    [accessToken, followingByUser],
  );

  function MemberRow({ m }: Readonly<{ m: SquadMembersDialogRow }>) {
    const label = m.fullName?.trim() || m.username;
    const isSelf = m.username.toLowerCase() === me;
    const canFollow = accessToken && !isSelf;

    return (
      <div className="flex items-center gap-3 border-b border-border/60 py-3 last:border-b-0">
        <Link href={`/u/${encodeURIComponent(m.username)}`} className="flex min-w-0 flex-1 items-center gap-3">
          <img
            src={memberAvatarSrc(m.profileImg, m.username)}
            alt=""
            className="size-11 shrink-0 border-2 border-border object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-bold text-foreground">{label}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">@{m.username}</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-wide text-primary">{roleLabel(m.role)}</p>
          </div>
        </Link>
        {canFollow ? (
          <Button
            type="button"
            variant={followingByUser[m.username] ? 'outline' : 'primary'}
            size="sm"
            disabled={busyUser === m.username}
            className="shrink-0 font-mono text-[9px] font-black uppercase tracking-widest"
            onClick={() => void toggleFollow(m.username)}
          >
            {followingByUser[m.username] ? 'Following' : 'Follow'}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title="Squad members"
      titleIcon={<UsersRound className="size-5 text-primary" strokeWidth={2.5} aria-hidden />}
      subtitle="Admins and moderators are listed first. Search by name or username."
      panelClassName="max-w-lg"
      contentClassName="max-h-[min(70vh,32rem)] overflow-y-auto"
    >
      <div className="sticky top-0 z-10 -mx-1 border-b border-border bg-card pb-3">
        <label className="relative block">
          <span className="sr-only">Search members</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-10 w-full border-2 border-border bg-background py-2 pl-10 pr-3 text-sm outline-none ring-primary focus-visible:ring-2"
          />
        </label>
      </div>

      {staff.length > 0 ? (
        <div className="mt-4">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Admins & moderators
          </p>
          <div className="divide-y-0 border-2 border-border px-2">
            {staff.map((m) => (
              <MemberRow key={m.userId} m={m} />
            ))}
          </div>
        </div>
      ) : null}

      {regular.length > 0 ? (
        <div className={cn('mt-4', staff.length > 0 && 'border-t border-border pt-4')}>
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Members</p>
          <div className="border-2 border-border px-2">
            {regular.map((m) => (
              <MemberRow key={m.userId} m={m} />
            ))}
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No members match your search.</p>
      ) : null}
    </FormDialog>
  );
}

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

  const handleCardJoin = async (squadSlug: string) => {
    const row = merged.find((x) => x.slug === squadSlug);
    if (!row) return;
    if (!token) {
      openAuth('login');
      return;
    }
    if (row.visibility === 'private') {
      router.push(`/squads/${encodeURIComponent(squadSlug)}`);
      return;
    }
    setJoinBusySlug(squadSlug);
    try {
      await squadsApi.join(squadSlug, token);
      toast.success('Joined squad');
      await load();
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
          title={<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Unknown category</h1>}
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
                  onEditSquad={token && s.viewerRole === 'admin' ? () => router.push(`/squads/${encodeURIComponent(s.slug)}`) : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
