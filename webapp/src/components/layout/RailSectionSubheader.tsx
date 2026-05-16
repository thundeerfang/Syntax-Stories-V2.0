'use client';

import Link from 'next/link';
import type { ChangeEvent, ReactNode } from 'react';
import { SearchableSelect, type SearchableSelectOption } from '@/components/retroui';
import { SearchField } from '@/components/ui/SearchField';
import { cn } from '@/lib/utils';

export type RailSectionSubheaderSearchProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  wrapperClassName?: string;
  onFocus?: () => void;
}>;

export type RailSectionSubheaderSortProps = Readonly<{
  /** Stable id for the sort trigger (a11y). */
  id: string;
  /** Current sort key — must match one of `options[].value`. */
  value: string;
  /** Called when the user picks a new sort option. */
  onChange: (value: string) => void;
  /** Dropdown choices (`value` + human `label`). */
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Width utility classes on the select root (default compact toolbar width). */
  widthClass?: string;
}>;

export type RailSectionSubheaderButtonProps = Readonly<{
  label: ReactNode;
  /** Renders as `Link` when set; otherwise a `<button>`. */
  href?: string;
  onClick?: () => void;
  /** `primary` = brand fill; `default` = neutral outline. */
  variant?: 'default' | 'primary';
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}>;

function hasRailLabel(label: ReactNode | undefined): boolean {
  if (label == null) return false;
  if (typeof label === 'string') return label.trim().length > 0;
  return true;
}

function hasRailText(text: ReactNode | undefined): boolean {
  if (text == null) return false;
  if (typeof text === 'string') return text.trim().length > 0;
  return true;
}

export type RailSectionSubheaderProps = Readonly<{
  /** Small / secondary label (left, before text). Omit for title-only rails. */
  label?: ReactNode;
  /** Primary line — single line with ellipsis when space is tight. Omit to show `buttons` on the left. */
  text?: ReactNode;
  /** Built-in search field (icon included). Omit to hide search. */
  search?: RailSectionSubheaderSearchProps;
  /** Optional value-based sort dropdown. */
  sort?: RailSectionSubheaderSortProps;
  /** Toolbar actions — use `variant: 'primary'` for the main CTA. */
  buttons?: ReadonlyArray<RailSectionSubheaderButtonProps>;
  /** Optional swiper prev/next — rendered last (far right). */
  swiperButtons?: ReactNode;
  className?: string;
}>;

const RAIL_TOOLBAR_BTN_BASE =
  'inline-flex h-[42px] shrink-0 items-center justify-center rounded-none border-2 px-3 font-mono text-[10px] font-black uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

const RAIL_TOOLBAR_BTN_VARIANT = {
  default: 'border-border bg-background text-foreground hover:bg-muted/50',
  primary: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
} as const;

export function RailSectionSubheaderButton({
  label,
  href,
  onClick,
  variant = 'default',
  className,
  ariaLabel,
  disabled = false,
}: RailSectionSubheaderButtonProps) {
  const cls = cn(RAIL_TOOLBAR_BTN_BASE, RAIL_TOOLBAR_BTN_VARIANT[variant], className);

  if (href != null && href !== '') {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {label}
    </button>
  );
}

function RailToolbarButtons({
  buttons,
}: Readonly<{ buttons: ReadonlyArray<RailSectionSubheaderButtonProps> }>) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {buttons.map((btn, i) => (
        <RailSectionSubheaderButton key={btn.href ?? btn.ariaLabel ?? i} {...btn} />
      ))}
    </div>
  );
}

/**
 * One full-width white (light) / card toolbar: label + one-line text on the left;
 * optional search, sort dropdown, primary actions, then swiper controls last.
 * When `text` is omitted, `buttons` render on the left instead of the right.
 */
export function RailSectionSubheader({
  label,
  text,
  search,
  sort,
  buttons,
  swiperButtons,
  className,
}: RailSectionSubheaderProps) {
  const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    search?.onChange(e.target.value);
  };
  const showLabel = hasRailLabel(label);
  const showText = hasRailText(text);
  const hasButtons = buttons != null && buttons.length > 0;
  const buttonsOnLeft = hasButtons && !showText;
  const buttonsOnRight = hasButtons && showText;

  return (
    <div className={cn('w-full min-w-0', className)}>
      <div
        className={cn(
          'flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-2 border-border bg-white px-3 py-2 shadow-[4px_4px_0_0_var(--border)] sm:gap-x-4 sm:px-4 sm:py-2.5 dark:bg-card',
        )}
      >
        <div className="flex min-h-[42px] min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3">
          {showLabel ? (
            <div className="shrink-0 font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {label}
            </div>
          ) : null}
          {showText ? (
            <div className="min-w-0 flex-1 truncate font-sans text-sm font-bold leading-none text-foreground sm:text-base">
              {text}
            </div>
          ) : buttonsOnLeft ? (
            <RailToolbarButtons buttons={buttons} />
          ) : null}
        </div>

        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-2">
          {search != null ? (
            <div className="flex min-w-0 shrink-0 items-center">
              <SearchField
                value={search.value}
                onChange={onSearchChange}
                onFocus={search.onFocus}
                placeholder={search.placeholder ?? 'Search…'}
                aria-label={search.ariaLabel}
                disabled={search.disabled}
                wrapperClassName={cn(
                  'min-w-0 max-w-[11rem] sm:max-w-[15rem]',
                  search.wrapperClassName,
                )}
              />
            </div>
          ) : null}
          {sort != null ? (
            <div className="flex shrink-0 items-center">
              <SearchableSelect
                id={sort.id}
                label=""
                placeholder={sort.placeholder ?? 'Sort'}
                value={sort.value}
                onChange={sort.onChange}
                options={sort.options}
                disabled={sort.disabled}
                searchable={false}
                listMaxHeight={220}
                widthClass={sort.widthClass ?? 'w-[8.75rem] sm:w-[9.75rem]'}
                className="gap-0 [&>label]:hidden"
                triggerClassName="h-[42px] rounded-none py-0 font-mono text-[10px] font-black uppercase tracking-widest"
                listboxClassName="rounded-none shadow-none"
              />
            </div>
          ) : null}
          {buttonsOnRight ? <RailToolbarButtons buttons={buttons} /> : null}
          {swiperButtons != null ? (
            <div className="flex shrink-0 items-center gap-1">{swiperButtons}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
