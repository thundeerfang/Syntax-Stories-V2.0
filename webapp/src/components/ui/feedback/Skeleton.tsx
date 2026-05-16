'use client';

import { cn } from '@/lib/core/utils';


interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional class name for the skeleton bar */
  className?: string;
}

export function Skeleton({ className, ...props }: Readonly<SkeletonProps>) {
  return (
    <div
      className={cn('animate-pulse  bg-muted', className)}
      aria-hidden
      {...props}
    />
  );
}

/** Square placeholder for skill / stack badge icons (matches page skeleton chips). */
export function SkillIconSkeleton({ className, ...props }: Readonly<SkeletonProps>) {
  return (
    <Skeleton
      className={cn(' border border-border/50 bg-muted/40', className)}
      {...props}
    />
  );
}
