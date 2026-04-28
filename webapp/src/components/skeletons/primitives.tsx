'use client';

import type { ComponentProps, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/** Flat retro block — structural placeholder, not a spinner. */
export function SkBlock({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-none border border-border/50 bg-muted/35', className)}
      {...props}
    />
  );
}

export function SkBar({ className, style }: { className?: string; style?: CSSProperties }) {
  return <SkBlock className={cn('h-2.5 animate-pulse', className)} style={style} />;
}
