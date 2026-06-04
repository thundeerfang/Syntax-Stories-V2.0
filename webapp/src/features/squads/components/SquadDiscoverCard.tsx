'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Lock, UserPlus } from 'lucide-react';
import type { SquadSummary } from '@/api/squads';
import { Button } from '@/components/ui/button';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';
import { squadCategoryLabel } from '@/lib/squads/squadCategory';
import { PrimaryCoverFallback } from '@/lib/shell/primaryCoverFallback';
import { cn } from '@/lib/core/utils';
import { triggerFollowConfetti } from '@/store/engagementEffects';

const SQUAD_CORNER_BTN =
  '!size-9 !min-h-9 !min-w-9 shrink-0 !p-0 active:translate-x-0 active:translate-y-0 active:shadow-none';
const SQUAD_CORNER_JOIN_CLASS = cn(
  SQUAD_CORNER_BTN,
  '!border-border !bg-white !text-primary hover:!bg-white hover:!text-primary hover:!opacity-90'
);
const SQUAD_CORNER_OPEN_CLASS = cn(
  SQUAD_CORNER_BTN,
  '!border-primary !bg-primary !text-white hover:!bg-primary hover:!text-white hover:!opacity-90'
);

function formatMemberCount(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (n >= 1_000) {
    const v = n / 1_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')}K`;
  }

  return n.toLocaleString();
}

export function resolveSquadMediaUrl(url: string | null | undefined): string | undefined {
  const t = url?.trim();

  if (!t) return undefined;

  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:')) {
    return t;
  }

  const base = resolvePublicApiBase().replace(/\/$/, '');

  return `${base}${t.startsWith('/') ? '' : '/'}${t}`;
}

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

const accentPurple = 'text-violet-700 dark:text-violet-400';

export type SquadDiscoverCardProps = Readonly<{
  squad: SquadSummary;
  isMember: boolean;
  joinBusy?: boolean;
  /** Return `false` when join did not happen (e.g. login gate). */
  onJoin: (slug: string) => void | boolean | Promise<void | boolean>;
  joinCtaLabel?: string;
  className?: string;
  topRightAccessory?: ReactNode;
}>;

/**
 * Shared discover / directory squad tile
 */
export function SquadDiscoverCard({
  squad,
  isMember,
  joinBusy = false,
  onJoin,
  joinCtaLabel,
  className,
  topRightAccessory,
}: SquadDiscoverCardProps) {
  const href = `/squads/${encodeURIComponent(squad.slug)}`;

  const handle = squad.handle ?? squad.slug;

  const banner = resolveSquadMediaUrl(squad.coverBannerUrl);

  const icon = resolveSquadMediaUrl(squad.iconUrl);

  const previews = squad.memberPreview ?? [];

  const categoryLabel =
    squad.visibility === 'public' && squad.category ? squadCategoryLabel(squad.category) : null;

  const joinCtaLabelResolved =
    joinCtaLabel ?? (squad.visibility === 'private' ? 'Open squad' : 'Join squad');

  const joined = isMember || squad.viewerRole != null;
  const showOpen = joined || squad.visibility === 'private';

  return (
    <div
      className={cn(
        'relative mx-auto flex w-full max-w-[22.5rem] flex-col overflow-hidden ',
        'border-[3px] border-border bg-background text-left',
        'shadow',
        'before:pointer-events-none before:absolute before:-inset-2 before:-z-10 before:content-[""]',
        'before:bg-[radial-gradient(circle_at_bottom,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_72%)]',
        'before:blur-2xl',
        className
      )}
    >
      <div className="absolute right-2 top-2 z-30 flex items-center gap-1.5">
        {topRightAccessory}

        {showOpen ? (
          <Button
            href={href}
            variant="primary"
            size="sm"
            className={SQUAD_CORNER_OPEN_CLASS}
            aria-label={joined ? 'Open squad' : joinCtaLabelResolved}
          >
            <ArrowUpRight className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={SQUAD_CORNER_JOIN_CLASS}
            aria-label={joinCtaLabelResolved}
            disabled={joinBusy}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              void (async () => {
                try {
                  const joinedOk = await onJoin(squad.slug);
                  if (joinedOk !== false) {
                    triggerFollowConfetti(rect);
                  }
                } catch {
                  /* join failed — no confetti */
                }
              })();
            }}
          >
            <UserPlus className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
          </Button>
        )}
      </div>

      {/* Banner */}
      <div className="relative h-[7rem] shrink-0 overflow-hidden md:h-[8rem]">
        {banner ? (
          <>
            <img src={banner} alt="" className="size-full object-cover" />

            <div
              className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--background)_14%,transparent)] dark:bg-[color-mix(in_srgb,var(--background)_42%,transparent)]"
              aria-hidden
            />

            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--primary)_28%,transparent),transparent_42%)]"
              aria-hidden
            />

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[5.5rem] bg-gradient-to-t from-background/90 via-background/28 to-transparent dark:from-background/95 dark:via-background/40"
              aria-hidden
            />

            <svg
              className="pointer-events-none absolute inset-0 size-full text-white/10"
              viewBox="0 0 400 160"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                d="M-40 120 Q80 40 200 100 T440 80"
              />
            </svg>
          </>
        ) : (
          <>
            <PrimaryCoverFallback variant="squad" />

            <div
              className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--background)_12%,transparent)] dark:bg-[color-mix(in_srgb,var(--background)_38%,transparent)]"
              aria-hidden
            />

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[5.5rem] bg-gradient-to-t from-background/90 via-background/28 to-transparent dark:from-background/95 dark:via-background/40"
              aria-hidden
            />
          </>
        )}
      </div>

      {/* Overlap zone: transparent so banner shows behind icon + members */}
      <div className="relative -mt-14 flex flex-col bg-transparent px-4 pt-0 md:-mt-16 md:px-5">
        {/* Top Row */}
        <div className="relative z-20 flex items-end gap-3.5 pb-2">
          {/* Squad Icon */}
          <div
            className={cn(
              'relative z-30 shrink-0 overflow-hidden ',
              'border-[3px] border-border bg-card',
              'after:pointer-events-none after:absolute after:-inset-3 after:-z-10 after:content-[""]',
              'after:bg-[radial-gradient(circle,color-mix(in_srgb,var(--primary)_22%,transparent)_0%,transparent_70%)]',
              'after:blur-xl',
              'size-[3rem] md:size-[4rem]'
            )}
          >
            {icon ? (
              <img src={icon} alt="" className="block size-full object-cover object-center" />
            ) : (
              <div className="flex size-full items-center justify-center bg-amber-300 font-black text-2xl text-teal-950">
                {squad.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="relative z-20 min-w-0 flex-1 pt-7">
            <div className="flex -space-x-2">
              {previews.slice(0, 3).map((m) => (
                <img
                  key={m.username}
                  src={memberAvatarSrc(m.profileImg, m.username)}
                  alt=""
                  title={m.username}
                  className="size-7 border-2 border-white/90 object-cover shadow"
                />
              ))}
            </div>

            <p
              className={cn(
                'mt-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.12em]',
                accentPurple
              )}
            >
              {formatMemberCount(squad.memberCount)} members
            </p>
          </div>
        </div>

        {/* Solid card body from title down */}
        <div className="relative z-10 mt-2 min-w-0 space-y-1 bg-background pb-3 pt-1">
          <Link href={href} className="block min-w-0">
            <h3 className="truncate text-lg font-black uppercase leading-tight tracking-tight text-foreground md:text-xl">
              {squad.name}
            </h3>
          </Link>

          <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
            <p className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-muted-foreground">
              @{handle}
            </p>

            {categoryLabel ? (
              <span
                className={cn(
                  'shrink-0  border border-border',
                  'bg-muted/50 px-1 py-px dark:bg-muted/35',
                  'font-mono text-[9px] font-black uppercase tracking-widest',
                  'text-foreground'
                )}
              >
                {categoryLabel}
              </span>
            ) : squad.visibility === 'private' ? (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 ',
                  'border border-border bg-muted/45 px-1 py-px dark:bg-muted/30',
                  'font-mono text-[9px] font-black uppercase tracking-widest',
                  'text-foreground'
                )}
              >
                <Lock className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
                Private
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-10 -bottom-6 h-10 bg-primary/20 blur-2xl"
        aria-hidden
      />
    </div>
  );
}
