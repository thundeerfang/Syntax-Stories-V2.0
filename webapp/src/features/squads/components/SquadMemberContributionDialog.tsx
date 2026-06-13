'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { Calendar, PenLine, Share2 } from 'lucide-react';
import { squadsApi } from '@/api/squads';
import type { SquadMemberContribution } from '@contracts/squadsApi';
import { Dialog, DIALOG_Z_INDEX_STACKED } from '@/components/ui/dialog';
import { cn } from '@/lib/core/utils';
import { toast } from 'sonner';

export type SquadMemberContributionTarget = Readonly<{
  username: string;
  fullName: string;
  profileImg: string;
  joinedAt?: string;
}>;

export type SquadMemberContributionDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  squadSlug: string;
  squadName: string;
  accessToken: string | null;
  member: SquadMemberContributionTarget | null;
}>;

function memberAvatarSrc(profileImg: string | undefined, username: string): string {
  const trimmed = profileImg?.trim();
  if (!trimmed) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
  }
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return `${base.replace(/\/$/, '')}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function formatJoined(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ContributionStatCard({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: typeof PenLine;
  label: string;
  value: number;
}>) {
  return (
    <div className="border-2 border-primary/25 bg-primary/10 px-3 py-3 text-center backdrop-blur-md dark:border-primary/35 dark:bg-primary/15">
      <span className="mx-auto flex size-9 items-center justify-center border border-primary/30 bg-primary/15 text-primary backdrop-blur-sm dark:border-primary/40 dark:bg-primary/20">
        <Icon className="size-4" strokeWidth={2.25} aria-hidden />
      </span>
      <p className="mt-2 font-mono text-xl font-black tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-primary/80">
        {label}
      </p>
    </div>
  );
}

export function SquadMemberContributionDialog({
  open,
  onClose,
  squadSlug,
  squadName,
  accessToken,
  member,
}: SquadMemberContributionDialogProps) {
  const titleId = useId();
  const [stats, setStats] = useState<SquadMemberContribution | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !member) {
      setStats(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void squadsApi
      .getMemberStats(squadSlug, member.username, accessToken)
      .then((r) => {
        if (!cancelled) setStats(r.stats);
      })
      .catch((e) => {
        if (!cancelled) {
          setStats(null);
          toast.error(e instanceof Error ? e.message : 'Could not load contribution');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, member, squadSlug, accessToken]);

  const label = member?.fullName?.trim() || member?.username || 'Member';
  const joinedAt = stats?.joinedAt ?? member?.joinedAt;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      showCloseButton
      panelClassName="max-w-sm overflow-visible border-primary/30 dark:border-primary/35"
      contentClassName="p-0 overflow-visible"
      legacyCloseContentInset={false}
      zIndex={DIALOG_Z_INDEX_STACKED}
    >
      <div className="relative min-h-full w-full overflow-visible bg-gradient-to-b from-primary/18 via-primary/8 to-card dark:from-primary/22 dark:via-primary/10 dark:to-card">
        <div className="flex flex-col items-center px-6 pb-8 pt-10 text-center sm:px-8 sm:pb-10 sm:pt-12">
          {member ? (
            <>
              <img
                src={memberAvatarSrc(member.profileImg, member.username)}
                alt=""
                className="size-16 shrink-0 border-2 border-primary/40 object-cover shadow dark:border-primary/50"
              />
              <h2
                id={titleId}
                className="mt-5 max-w-[18rem] text-base font-black uppercase tracking-wide text-foreground sm:text-lg"
              >
                {label}
              </h2>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                @{member.username}
              </p>

              {loading ? (
                <div className="mt-3 h-6 w-36 animate-pulse border-2 border-border bg-muted/30" />
              ) : (
                <span className="mt-3 inline-flex items-center gap-1.5 border-2 border-primary/35 bg-primary/10 px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-widest text-primary">
                  <Calendar className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
                  Joined {formatJoined(joinedAt)}
                </span>
              )}

              <p className="mt-3 max-w-[20rem] text-[11px] leading-relaxed text-muted-foreground">
                Activity in {squadName}
              </p>

              <div className="mt-6 w-full max-w-[20rem]">
                {loading ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[5.5rem] animate-pulse border-2 border-primary/20 bg-primary/10 backdrop-blur-md"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <ContributionStatCard
                      icon={PenLine}
                      label="Authored"
                      value={stats?.postsAuthored ?? 0}
                    />
                    <ContributionStatCard
                      icon={Share2}
                      label="Shared"
                      value={stats?.postsShared ?? 0}
                    />
                  </div>
                )}

                <div className="mt-4 border-t border-border/70 pt-4">
                  <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-bold text-foreground">Authored</span>
                    <span aria-hidden>:- </span>
                    posts they published directly to this squad.
                  </p>
                  <p className="mt-1.5 text-center text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-bold text-foreground">Shared</span>
                    <span aria-hidden>:- </span>
                    existing posts they added to the squad feed.
                  </p>
                </div>
              </div>

              <Link
                href={`/u/${encodeURIComponent(member.username)}`}
                onClick={onClose}
                className={cn(
                  'mt-8 w-full max-w-[20rem] border-2 border-primary bg-primary px-6 py-3.5 text-center font-black text-xs uppercase tracking-widest text-primary-foreground shadow',
                  'transition-all hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                )}
              >
                View profile
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
