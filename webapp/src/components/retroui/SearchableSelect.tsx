'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { Label } from './Label';
import { cn } from '@/lib/utils';

/** Above dialog panels (z-[100]) so the list tracks the trigger while the dialog body scrolls. */
const LISTBOX_Z = 160;

export interface SearchableSelectOption {
  value: string;
  label: string;
}

function SearchableSelectListboxShell({
  children,
  panelPos,
  listboxRef,
}: Readonly<{
  children: React.ReactNode;
  panelPos: { top: number; left: number; width: number };
  listboxRef: React.RefObject<HTMLDivElement | null>;
}>) {
  return (
    <div
      ref={listboxRef}
      className="fixed rounded-md border-2 border-border bg-card shadow-lg overflow-hidden flex flex-col"
      style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width, zIndex: LISTBOX_Z }}
      role="listbox"
    >
      {children}
    </div>
  );
}

function SearchableSelectOptionRow({
  selected,
  label,
  onSelect,
  className,
}: Readonly<{ selected: boolean; label: string; onSelect: () => void; className: string }>) {
  return (
    <button type="button" role="option" aria-selected={selected} onClick={onSelect} className={className}>
      {label}
    </button>
  );
}

export interface SearchableSelectProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  disabled?: boolean;
  error?: string;
  className?: string;
  /** Control width from parent: e.g. "w-full", "sm:w-1/2", "sm:col-span-4" (when inside a grid) */
  widthClass?: string;
  /** Max height of dropdown list (default 220px) */
  listMaxHeight?: number;
}

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined | null>) {
  return (node: T | null) => {
    for (const r of refs) {
      if (r == null) continue;
      if (typeof r === 'function') r(node);
      else (r as { current: T | null }).current = node;
    }
  };
}

export const SearchableSelect = React.forwardRef<HTMLDivElement, SearchableSelectProps>(
  (
    {
      id,
      label,
      placeholder = 'Select...',
      value,
      onChange,
      options,
      disabled = false,
      error,
      className,
      widthClass,
      listMaxHeight = 220,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [panelPos, setPanelPos] = React.useState({ top: 0, left: 0, width: 200 });
    const [scrollableMax, setScrollableMax] = React.useState(listMaxHeight);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const listboxRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const selectedOption = options.find((o) => o.value === value);
    const displayLabel = selectedOption?.label ?? (value || '');

    const filtered = React.useMemo(() => {
      if (!search.trim()) return options;
      const q = search.toLowerCase();
      return options.filter(
        (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
      );
    }, [options, search]);

    const updateListPosition = React.useCallback(() => {
      const btn = buttonRef.current;
      if (!btn || !open) return;
      const r = btn.getBoundingClientRect();
      const w = Math.max(r.width, 200);
      const top = r.bottom + 4;
      const margin = 8;
      const searchChrome = 72;
      const scrollMax = Math.min(
        listMaxHeight,
        Math.max(80, globalThis.innerHeight - top - margin - searchChrome)
      );
      setPanelPos({ top, left: r.left, width: w });
      setScrollableMax(scrollMax);
    }, [open, listMaxHeight]);

    React.useLayoutEffect(() => {
      updateListPosition();
    }, [open, updateListPosition, filtered.length, value]);

    React.useEffect(() => {
      if (!open) return;
      const onScrollOrResize = () => updateListPosition();
      globalThis.addEventListener('scroll', onScrollOrResize, true);
      globalThis.addEventListener('resize', onScrollOrResize);
      return () => {
        globalThis.removeEventListener('scroll', onScrollOrResize, true);
        globalThis.removeEventListener('resize', onScrollOrResize);
      };
    }, [open, updateListPosition]);

    React.useEffect(() => {
      if (!open) setSearch('');
    }, [open]);

    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const t = e.target as Node;
        if (containerRef.current?.contains(t)) return;
        if (listboxRef.current?.contains(t)) return;
        setOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (opt: SearchableSelectOption) => {
      onChange(opt.value);
      setOpen(false);
    };

    return (
      <div
        ref={mergeRefs(containerRef, ref)}
        className={cn('grid items-center gap-1.5 min-w-0', widthClass ?? 'w-full', className)}
      >
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            id={id}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setOpen((o) => !o);
              if (!open) setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className={cn(
              'w-full min-w-0 rounded-md border-2 border-border bg-background px-3 py-2.5 text-sm font-medium text-left flex items-center justify-between gap-2',
              'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive',
              open && 'border-primary ring-2 ring-primary/20'
            )}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className={cn('min-w-0 truncate', !displayLabel && 'text-muted-foreground')}>
              {displayLabel || placeholder}
            </span>
            <ChevronDown
              className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            />
          </button>

          {open &&
            typeof document !== 'undefined' &&
            createPortal(
              <SearchableSelectListboxShell panelPos={panelPos} listboxRef={listboxRef}>
                <div className="p-2 border-b-2 border-border bg-muted/20 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setOpen(false);
                      }}
                      placeholder="Search..."
                      className="w-full rounded border-2 border-border bg-background py-2 pl-9 pr-3 text-sm font-medium focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto min-h-0" style={{ maxHeight: scrollableMax }}>
                  {filtered.length === 0 ? (
                    <p className="py-4 text-center text-[10px] font-bold text-muted-foreground uppercase">
                      No results
                    </p>
                  ) : (
                    filtered.map((opt) => (
                      <SearchableSelectOptionRow
                        key={opt.value}
                        selected={opt.value === value}
                        label={opt.label}
                        onSelect={() => handleSelect(opt)}
                        className={cn(
                          'w-full px-3 py-2.5 text-left text-sm font-medium transition-colors',
                          opt.value === value
                            ? 'bg-primary/15 text-primary border-l-2 border-primary'
                            : 'hover:bg-muted/50'
                        )}
                      />
                    ))
                  )}
                </div>
              </SearchableSelectListboxShell>,
              document.body
            )}
        </div>
        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      </div>
    );
  }
);

SearchableSelect.displayName = 'SearchableSelect';
