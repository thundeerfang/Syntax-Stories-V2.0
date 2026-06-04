'use client';

import { useId } from 'react';
import { cn } from '@/lib/core/utils';

export type GridPatternProps = Readonly<{
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  squares?: Array<[number, number]>;
  strokeDasharray?: string;
  className?: string;
}>;

/** Magic UI–style grid pattern (https://magicui.design/docs/components/grid-pattern). */
export function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = '0',
  squares,
  className,
}: GridPatternProps) {
  const id = useId();

  return (
    <svg
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full fill-neutral-400/30 stroke-neutral-400/30',
        className
      )}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares?.map(([sx, sy], index) => (
        <rect
          key={`${sx}-${sy}-${index}`}
          strokeWidth="0"
          width={width - 1}
          height={height - 1}
          x={sx * width + 1}
          y={sy * height + 1}
        />
      ))}
    </svg>
  );
}
