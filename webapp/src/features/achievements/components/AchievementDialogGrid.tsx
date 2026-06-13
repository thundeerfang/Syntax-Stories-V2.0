'use client';

import { GridPattern } from '@/components/magicui/grid-pattern';
import { cn } from '@/lib/core/utils';

/** Highlight cells — same rhythm as app shell grid, tuned for dialog scale. */
export const ACHIEVEMENT_DIALOG_GRID_SQUARES: Array<[number, number]> = [
  [4, 4],
  [5, 1],
  [8, 2],
  [5, 3],
  [5, 5],
  [10, 10],
  [12, 15],
  [15, 10],
  [10, 15],
  [3, 8],
  [7, 12],
];

type AchievementDialogGridProps = Readonly<{
  className?: string;
  variant?: 'hero' | 'header';
}>;

/** Magic UI grid layer for achievement modals — skewed lines + filled highlight squares. */
export function AchievementDialogGrid({ className, variant = 'hero' }: AchievementDialogGridProps) {
  const mask =
    variant === 'header'
      ? '[mask-image:radial-gradient(320px_circle_at_50%_0%,#000_55%,transparent_100%)]'
      : '[mask-image:radial-gradient(420px_circle_at_center,white,transparent_72%)]';

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-transparent to-primary/[0.04]" />
      <GridPattern
        squares={ACHIEVEMENT_DIALOG_GRID_SQUARES}
        className={cn(
          'fill-neutral-400/20 stroke-neutral-400/25 dark:fill-neutral-500/15 dark:stroke-neutral-500/20',
          '[&_rect]:fill-primary/30 [&_rect]:dark:fill-primary/35',
          mask,
          variant === 'hero'
            ? 'inset-x-[-12%] inset-y-[-35%] h-[170%] w-[124%] skew-y-12'
            : 'inset-x-0 inset-y-[-20%] h-[140%] w-full skew-y-6'
        )}
      />
      <div
        className={cn(
          'absolute inset-0',
          variant === 'hero'
            ? 'bg-gradient-to-t from-card via-card/88 to-card/35'
            : 'bg-gradient-to-b from-card/92 via-card/72 to-transparent'
        )}
      />
    </div>
  );
}
