'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Sparkles, Trophy } from 'lucide-react';
import { achievementsApi } from '@/api/achievements';
import { BlogApiConnectionError } from '@/lib/api/blogAuthFetch';
import {
  RailFeedEmptyState,
  RailFeedErrorState,
  resolveFeedErrorPresentation,
  ShellPageIntroHeader,
  SignInRequiredPanel,
} from '@/components/layout';
import { AchievementsPageSkeletonInner } from '@/components/skeletons';
import type { AchievementProgressItemDto } from '@/contracts/achievementsApi';
import { AchievementCard } from '@/features/achievements/components/AchievementCard';
import { cn } from '@/lib/core/utils';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { useAuthStore } from '@/store/auth';
import { useRouteRestoreNonce } from '@/hooks/useRouteRestore';

type Filter = 'all' | 'unlocked' | 'in_progress';

const FILTER_TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'unlocked', label: 'Unlocked' },
];

function StatCard({
  label,
  value,
  hint,
  accent,
  icon: Icon,
}: Readonly<{
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  icon: typeof Award;
}>) {
  return (
    <div className="border-4 border-border bg-card p-4 shadow">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <Icon className={cn('size-4 shrink-0', accent ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
        {label}
      </div>
      <p
        className={cn(
          'mt-2 text-3xl font-black tabular-nums tracking-tight',
          accent ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[10px] font-medium text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AchievementsPage() {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const routeRestoreNonce = useRouteRestoreNonce();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<AchievementProgressItemDto[]>([]);
  const [summary, setSummary] = useState({
    unlockedCount: 0,
    total: 10,
    totalPoints: 0,
    xp: 0,
    level: 1,
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const attemptFetch = async () => {
      const data = await achievementsApi.list(token);
      setItems(data.items);
      setSummary({
        unlockedCount: data.unlockedCount,
        total: data.total,
        totalPoints: data.totalPoints,
        xp: data.xp ?? 0,
        level: data.level ?? 1,
      });
    };

    try {
      try {
        await attemptFetch();
      } catch (e) {
        if (e instanceof BlogApiConnectionError) {
          await new Promise((r) => setTimeout(r, 1500));
          await attemptFetch();
          return;
        }
        throw e;
      }
    } catch (e) {
      const { description } = resolveFeedErrorPresentation(e, {
        title: 'Could not load achievements',
        connectionDescription: 'The server may still be starting. Wait a moment and try again.',
        fallbackDescription: 'Something went wrong loading your badges.',
      });
      setError(description);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      setLoading(false);
      return;
    }
    void load();
  }, [isHydrated, token, load, routeRestoreNonce]);

  const filtered = useMemo(() => {
    if (filter === 'unlocked') return items.filter((i) => i.unlocked);
    if (filter === 'in_progress') return items.filter((i) => !i.unlocked && !i.locked);
    return items;
  }, [items, filter]);

  const inProgressCount = useMemo(
    () => items.filter((i) => !i.unlocked && !i.locked).length,
    [items]
  );

  const completionPct =
    summary.total > 0 ? Math.round((summary.unlockedCount / summary.total) * 100) : 0;

  if (!isHydrated || (token && loading)) {
    return <AchievementsPageSkeletonInner />;
  }

  if (!token) {
    return (
      <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')}>
        <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
          <ShellPageIntroHeader
            breadcrumbItems={[{ href: '/', label: 'Home' }, { label: 'Achievements' }]}
            description="Track milestones across reading, writing, and community actions. Earn points as you unlock badges."
            title={
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center bg-foreground text-background shadow [&_svg]:size-7">
                  <Award aria-hidden />
                </span>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
                  Your{' '}
                  <span className="text-primary underline decoration-4 underline-offset-4 sm:decoration-6 sm:underline-offset-6">
                    progress.
                  </span>
                </h1>
              </div>
            }
          />
          <SignInRequiredPanel
            icon={Award}
            title="Sign in for achievements"
            description="Track progress, earn points, and unlock badges on your Syntax Stories profile."
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <ShellPageIntroHeader
          breadcrumbItems={[{ href: '/', label: 'Home' }, { label: 'Achievements' }]}
          description="Complete actions across the platform to unlock badges and stack points on your profile."
          title={
            <div className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center bg-foreground text-background shadow [&_svg]:size-7">
                <Award aria-hidden />
              </span>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
                Your{' '}
                <span className="text-primary underline decoration-4 underline-offset-4 sm:decoration-6 sm:underline-offset-6">
                  progress.
                </span>
              </h1>
            </div>
          }
        />

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Trophy}
            label="Unlocked"
            value={`${summary.unlockedCount}/${summary.total}`}
            hint={`${completionPct}% complete`}
          />
          <StatCard
            icon={Sparkles}
            label="Points"
            value={String(summary.totalPoints)}
            hint="From unlocked badges"
            accent
          />
          <StatCard
            icon={Award}
            label="In progress"
            value={String(inProgressCount)}
            hint="Active milestones"
          />
          <div className="border-4 border-border bg-card p-4 shadow sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
              Level
            </div>
            <p className="mt-2 text-3xl font-black tabular-nums text-primary">{summary.level}</p>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">
              {`${summary.xp} XP earned`}
            </p>
          </div>
        </div>

        {/* Catalog */}
        <section className="border-4 border-border bg-card shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-border bg-muted/30 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center border-2 border-border bg-background shadow-sm">
                <Award className="size-4 text-primary" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-foreground">
                  Badge catalog
                </p>
                <p className="text-[10px] font-medium text-muted-foreground">
                  {`${filtered.length} shown · ${summary.total} total`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    'border-2 border-border px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest shadow transition-all',
                    filter === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-foreground hover:translate-x-px hover:translate-y-px hover:shadow-none'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="p-4 sm:p-5">
              <RailFeedErrorState
                variant="inline"
                title="Could not load achievements"
                error={error}
                onRetry={() => void load()}
                retryLabel="Try again"
              />
            </div>
          ) : filtered.length === 0 ? (
            <RailFeedEmptyState
              bordered={false}
              icon={Award}
              variant="filter"
              title={
                filter === 'unlocked'
                  ? 'No unlocked badges yet'
                  : filter === 'in_progress'
                    ? 'Nothing in progress'
                    : 'No achievements yet'
              }
              description={
                filter === 'unlocked'
                  ? 'Keep reading, writing, and engaging — your first unlock will show up here.'
                  : filter === 'in_progress'
                    ? 'Switch to All to see locked badges or start an action from the list.'
                    : 'Achievements will appear here once the catalog is available.'
              }
              actions={
                filter !== 'all'
                  ? [{ label: 'Show all', onClick: () => setFilter('all'), variant: 'primary' }]
                  : undefined
              }
              className="py-14 sm:py-16"
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5">
              {filtered.map((item) => (
                <li key={item.id} className="min-w-0 list-none">
                  <AchievementCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
