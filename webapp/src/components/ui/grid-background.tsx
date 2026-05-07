import { cn } from '@/lib/utils';

export function GridBackground({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden
      className={cn('grid-bg absolute inset-0 z-0 pointer-events-none', className)}
    />
  );
}
