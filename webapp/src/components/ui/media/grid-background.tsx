import { cn } from '@/lib/core/utils';
import { GridPattern } from '@/components/magicui/grid-pattern';

const GRID_SQUARES: Array<[number, number]> = [
  [4, 4],
  [5, 1],
  [8, 2],
  [5, 3],
  [5, 5],
  [10, 10],
  [12, 15],
  [15, 10],
  [10, 15],
];

/** App shell background — Magic UI grid pattern with radial mask. */
export function GridBackground({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden
      className={cn(
        'absolute inset-0 z-0 min-h-full overflow-hidden pointer-events-none bg-background',
        className
      )}
    >
      <GridPattern
        squares={GRID_SQUARES}
        className={cn(
          'fill-neutral-400/25 stroke-neutral-400/25 dark:fill-neutral-600/20 dark:stroke-neutral-600/20',
          '[mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_70%,transparent_110%)]',
          'inset-x-0 inset-y-[-30%] h-[200%] w-full skew-y-12'
        )}
      />
    </div>
  );
}
