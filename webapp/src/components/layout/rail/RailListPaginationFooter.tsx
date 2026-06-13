'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/core/utils';

const NAV_BTN_CLASS =
  'inline-flex size-9 shrink-0 items-center justify-center border-2 border-border bg-card text-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40';

const PAGE_BTN_CLASS =
  'inline-flex size-9 shrink-0 items-center justify-center border-2 font-mono text-[10px] font-black tabular-nums transition-colors';

function visiblePageIndices(current: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const start = Math.max(0, Math.min(current - 2, totalPages - 5));
  return Array.from({ length: 5 }, (_, i) => start + i);
}

export function RailResultRangeBadge({
  page,
  pageSize,
  total,
  className,
}: Readonly<{
  page: number;
  pageSize: number;
  total: number;
  className?: string;
}>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = total === 0 ? 0 : safePage * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(total, (safePage + 1) * pageSize);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 border-2 border-border bg-muted/25 px-2.5 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest text-foreground',
        className
      )}
      aria-label={`Showing ${start} to ${end} of ${total} results`}
    >
      <span className="text-primary tabular-nums">
        {start}–{end}
      </span>
      <span className="text-muted-foreground">of</span>
      <span className="tabular-nums">{total}</span>
    </span>
  );
}

export function RailListPaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
  className,
}: Readonly<{
  /** Zero-based page index. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const pages = visiblePageIndices(safePage, totalPages);
  const canPrev = safePage > 0;
  const canNext = safePage < totalPages - 1;

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-wrap items-center justify-between gap-3 pt-1',
        className
      )}
    >
      <RailResultRangeBadge page={safePage} pageSize={pageSize} total={total} />

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={disabled || !canPrev}
          onClick={() => onPageChange(safePage - 1)}
          className={NAV_BTN_CLASS}
        >
          <ChevronLeft className="size-4" strokeWidth={2.25} aria-hidden />
        </button>

        {pages.map((i) => {
          const active = i === safePage;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Page ${i + 1}`}
              aria-current={active ? 'page' : undefined}
              disabled={disabled}
              onClick={() => onPageChange(i)}
              className={cn(
                PAGE_BTN_CLASS,
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:bg-muted/50'
              )}
            >
              {i + 1}
            </button>
          );
        })}

        <button
          type="button"
          aria-label="Next page"
          disabled={disabled || !canNext}
          onClick={() => onPageChange(safePage + 1)}
          className={NAV_BTN_CLASS}
        >
          <ChevronRight className="size-4" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  );
}
