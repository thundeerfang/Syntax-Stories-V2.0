'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional class name for the skeleton bar */
  className?: string;
}

export function Skeleton({ className, ...props }: Readonly<SkeletonProps>) {
  return (
    <div
      className={cn('animate-pulse rounded-sm bg-muted', className)}
      aria-hidden
      {...props}
    />
  );
}
