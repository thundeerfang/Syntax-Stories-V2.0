'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, UsersRound } from 'lucide-react';
import { FormDialog } from '@/components/ui/FormDialog';
import { Button } from '@/components/ui/Button';
import { followApi } from '@/api/follow';
import type { SquadMemberRole } from '@/api/squads';
import { cn } from '@/lib/utils';
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
          <div className="divide-y-0 rounded-md border-2 border-border px-2">
            {staff.map((m) => (
              <MemberRow key={m.userId} m={m} />
            ))}
          </div>
        </div>
      ) : null}

      {regular.length > 0 ? (
        <div className={cn('mt-4', staff.length > 0 && 'border-t border-border pt-4')}>
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Members</p>
          <div className="rounded-md border-2 border-border px-2">
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
