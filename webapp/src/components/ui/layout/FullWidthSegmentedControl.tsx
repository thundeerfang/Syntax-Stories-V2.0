'use client';

import * as React from 'react';
import { cn } from '@/lib/core/utils';
import { retroMetricCard, retroPanel } from '@/lib/core/retroUi';

export type SegmentOption = { value: string; label: string };

export interface FullWidthSegmentedControlProps {
  value: string;
  onValueChange: (next: string) => void;
  options: readonly SegmentOption[];
  disabled?: boolean;
  label: string;
  className?: string;
}

/**
 * Full-width segmented control (neo-brutalist shell).
 * Equal-width columns; text truncates safely on small screens.
 */
export function FullWidthSegmentedControl({
  value,
  onValueChange,
  options,
  disabled,
  label,
  className,
}: FullWidthSegmentedControlProps) {
  const n = options.length;
  const gridCols =
    n <= 1
      ? 'grid-cols-1'
      : n === 2
        ? 'grid-cols-2'
        : n === 3
          ? 'grid-cols-3'
          : 'grid-cols-2 sm:grid-cols-4';

  return (
    <fieldset className={cn('m-0 min-w-0 border-0 p-0', className)}>
      <legend className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block w-full">
        {label}
      </legend>
      <div
        className={cn('grid w-full min-w-0 gap-1', retroPanel, gridCols)}
        role="group"
        aria-label={label}
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => {
                if (disabled || opt.value === value) return;
                onValueChange(opt.value);
              }}
              className={cn(
                'min-w-0 truncate px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'border-2 border-transparent',
                active
                  ? 'border-border bg-primary text-primary-foreground shadow'
                  : 'bg-card/80 text-foreground hover:bg-muted/90',
                disabled && 'pointer-events-none opacity-50'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export interface MetricCardProps {
  title: string;
  highlighted?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Stat card with adjustable width via parent grid (`minmax` / `auto-fit`). */
export function MetricCard({ title, highlighted, className, children }: MetricCardProps) {
  return (
    <div
      className={cn(
        retroMetricCard,
        highlighted && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
        className
      )}
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground truncate">
        {title}
      </p>
      <div className="mt-1 min-w-0">{children}</div>
    </div>
  );
}
