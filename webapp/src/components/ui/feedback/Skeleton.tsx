"use client";
import { cn } from "@/lib/core/utils";
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}
export function Skeleton({ className, ...props }: Readonly<SkeletonProps>) {
  return (
    <div
      className={cn("animate-pulse  bg-muted", className)}
      aria-hidden
      {...props}
    />
  );
}
export function SkillIconSkeleton({
  className,
  ...props
}: Readonly<SkeletonProps>) {
  return (
    <Skeleton
      className={cn(" border border-border/50 bg-muted/40", className)}
      {...props}
    />
  );
}
