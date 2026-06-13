'use client';

import Link from 'next/link';
import type { AchievementProgressItemDto } from '@/contracts/achievementsApi';
import { cn } from '@/lib/core/utils';
import { AchievementSlugIcon } from '../achievementIcons';

export function pickRecentUnlockedAchievements(
  items: AchievementProgressItemDto[],
  limit = 3
): AchievementProgressItemDto[] {
  return [...items]
    .filter((item) => item.unlocked && item.unlockedAt)
    .sort((a, b) => Date.parse(b.unlockedAt!) - Date.parse(a.unlockedAt!))
    .slice(0, limit);
}

function formatUnlockedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function RecentAchievementsPreview({
  items,
  className,
  viewAllHref = '/achievements',
}: Readonly<{
  items: AchievementProgressItemDto[];
  className?: string;
  viewAllHref?: string;
}>) {
  const recent = pickRecentUnlockedAchievements(items);

  if (recent.length === 0) {
    return (
      <p
        className={cn(
          'text-[9px] font-bold uppercase tracking-widest text-muted-foreground',
          className
        )}
      >
        No achievements unlocked yet.{' '}
        <Link href={viewAllHref} className="text-primary hover:underline">
          Browse all
        </Link>
      </p>
    );
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {recent.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-2.5 border-2 border-border bg-muted/10 px-2 py-1.5"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center border-2 border-primary/40 bg-primary/10 text-primary"
            aria-hidden
          >
            <AchievementSlugIcon slug={item.slug} className="size-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[10px] font-black uppercase tracking-wide text-foreground">
              {item.title}
            </p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
              +{item.points} pts
            </p>
          </div>
          {item.unlockedAt ? (
            <span className="shrink-0 text-[8px] font-bold uppercase tabular-nums tracking-widest text-primary">
              {formatUnlockedDate(item.unlockedAt)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
