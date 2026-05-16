'use client';

import { Newspaper, UsersRound } from 'lucide-react';
import { SPOTLIGHT_PRIMARY_GRADIENT } from '@/lib/shell/spotlightPrimaryGradient';
import { cn } from '@/lib/core/utils';


export type PrimaryCoverFallbackProps = Readonly<{
  variant?: 'blog' | 'squad';
  showLabel?: boolean;
  label?: string;
  /** Match hero cover image treatment (60% opacity). */
  dimmed?: boolean;
  className?: string;
}>;

/** Static primary gradient + centered icon/label when media cover is missing. */
export function PrimaryCoverFallback({
  variant = 'blog',
  showLabel = true,
  label,
  dimmed = false,
  className,
}: PrimaryCoverFallbackProps) {
  const Icon = variant === 'squad' ? UsersRound : Newspaper;
  const text =
    label ?? (variant === 'squad' ? 'No Cover Banner' : 'No Cover Image');

  return (
    <div
      className={cn('absolute inset-0 overflow-hidden', dimmed && 'opacity-60', className)}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{ backgroundImage: SPOTLIGHT_PRIMARY_GRADIENT }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <Icon
          className="size-7 text-primary-foreground/85"
          strokeWidth={variant === 'squad' ? 2 : 2.5}
          aria-hidden
        />
        {showLabel ? (
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
            {text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
