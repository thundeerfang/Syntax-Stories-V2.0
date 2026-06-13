'use client';

import type { ComponentProps, CSSProperties } from 'react';
import { SPOTLIGHT_PRIMARY_GRADIENT } from '@/lib/shell/spotlightPrimaryGradient';
import { cn } from '@/lib/core/utils';

/** Flat retro block — structural placeholder, not a spinner. */
export function SkBlock({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn(' border border-border/50 bg-muted/35', className)} {...props} />;
}

export function SkBar({ className, style }: { className?: string; style?: CSSProperties }) {
  return <SkBlock className={cn('h-2.5 animate-pulse', className)} style={style} />;
}

/** Primary gradient fill — matches live spotlight / cover fallbacks (not flat transparent). */
export function SkGradientFill({
  className,
  withBottomFade = true,
  pulse = true,
}: Readonly<{
  className?: string;
  withBottomFade?: boolean;
  pulse?: boolean;
}>) {
  return (
    <div className={cn('relative overflow-hidden', className)} aria-hidden>
      <div
        className={cn('absolute inset-0', pulse && 'animate-pulse')}
        style={{ backgroundImage: SPOTLIGHT_PRIMARY_GRADIENT }}
      />
      {withBottomFade ? (
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-background/85 via-background/35 to-transparent" />
      ) : null}
    </div>
  );
}
