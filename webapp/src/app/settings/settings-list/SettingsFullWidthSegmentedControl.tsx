'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type SettingsSegmentOption = { value: string; label: string };

export interface SettingsFullWidthSegmentedControlProps {
  /** Selected segment value */
  value: string;
  onValueChange: (next: string) => void;
  options: readonly SettingsSegmentOption[];
  disabled?: boolean;
  /** Accessible name (rendered as legend above the control) */
  label: string;
  className?: string;
}

/**
 * Full-width segmented control for settings (neo-brutalist shell).
 * Equal-width columns; text truncates safely on small screens.
 */
export function SettingsFullWidthSegmentedControl({
  value,
  onValueChange,
  options,
  disabled,
  label,
  className,
}: SettingsFullWidthSegmentedControlProps) {
  const n = options.length;
  const gridCols =
    n <= 1 ? 'grid-cols-1' : n === 2 ? 'grid-cols-2' : n === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';

  return (
    <fieldset className={cn('m-0 min-w-0 border-0 p-0', className)}>
      <legend className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block w-full">
        {label}
      </legend>
      <div
        className={cn(
          'grid w-full min-w-0 gap-1 border-2 border-border bg-muted/20 p-1 shadow-[3px_3px_0px_0px_var(--border)]',
          gridCols,
        )}
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
                  ? 'border-border bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--border)]'
                  : 'bg-card/80 text-foreground hover:bg-muted/90',
                disabled && 'pointer-events-none opacity-50',
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

export interface SettingsMetricCardProps {
  title: string;
  highlighted?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Stat card with adjustable width via parent grid (`minmax` / `auto-fit`). */
export function SettingsMetricCard({ title, highlighted, className, children }: SettingsMetricCardProps) {
  return (
    <div
      className={cn(
        'min-w-0 border-2 border-border bg-muted/10 p-4 shadow-[3px_3px_0px_0px_var(--border)]',
        highlighted && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
        className,
      )}
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground truncate">{title}</p>
      <div className="mt-1 min-w-0">{children}</div>
    </div>
  );
}
