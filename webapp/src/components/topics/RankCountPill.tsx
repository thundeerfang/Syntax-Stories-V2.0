'use client';

import { cn } from '@/lib/utils';

/** Compact circular count used in topic / category rank lists and category cards. */
export function RankCountPill({
  count,
  className,
  tone = 'default',
  'aria-label': ariaLabel,
}: Readonly<{
  count: number;
  className?: string;
  /** `inverse`: for primary (hero) backgrounds. */
  tone?: 'default' | 'inverse';
  'aria-label'?: string;
}>) {
  const label = ariaLabel ?? `${count.toLocaleString()} posts`;
  const text =
    count >= 1_000_000
      ? `${(count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, '')}M`
      : count >= 10_000
        ? `${Math.round(count / 1000)}k`
        : count >= 1000
          ? `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
          : count.toLocaleString();

  return (
    <span
      className={cn(
        'inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-black tabular-nums ring-1 ring-inset',
        tone === 'inverse'
          ? 'bg-primary-foreground/15 text-primary-foreground ring-primary-foreground/25'
          : 'bg-primary/12 text-primary ring-primary/20 dark:bg-primary/16',
        className,
      )}
      aria-label={label}
    >
      {text}
    </span>
  );
}
