'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { retroDropdownPanel, retroSortTrigger } from '@/lib/core/retroUi';
import { useDropdown } from '@/components/ui/dropdown';

export type RetroSortOption<T extends string> = Readonly<{
  value: T;
  label: string;
  shortLabel: string;
}>;

export type RetroSortDropdownProps<T extends string> = Readonly<{
  value: T;
  onChange: (value: T) => void;
  options: readonly RetroSortOption<T>[];
  /** Prefix for aria-label, e.g. `Sort bookmarks` → `Sort bookmarks: Newest`. */
  ariaLabelPrefix: string;
  triggerClassName?: string;
}>;

export function RetroSortDropdown<T extends string>({
  value,
  onChange,
  options,
  ariaLabelPrefix,
  triggerClassName,
}: RetroSortDropdownProps<T>) {
  const { rootRef: ref, open, toggle, close } = useDropdown<HTMLDivElement>();

  const selected = options.find((o) => o.value === value) ?? options[0];
  const label = selected?.label ?? '';
  const shortLabel = selected?.shortLabel ?? '';

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        title={label}
        aria-label={`${ariaLabelPrefix}: ${label}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggle}
        className={cn(retroSortTrigger, triggerClassName)}
      >
        <span className="min-w-0 truncate">{shortLabel}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
      {open ? (
        <ul role="listbox" className={retroDropdownPanel}>
          {options.map((o) => (
            <li key={o.value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={value === o.value}
                className={cn(
                  'flex w-full px-3 py-2.5 text-left font-mono text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-muted/60',
                  value === o.value && 'bg-primary/10 text-primary'
                )}
                onClick={() => {
                  onChange(o.value);
                  close();
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
