'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/core/utils';

export type RailFeedEmptyStateAction = Readonly<{
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'default';
  icon?: ReactNode;
  ariaLabel?: string;
}>;

export type RailFeedEmptyStateProps = Readonly<{
  icon: LucideIcon;
  title: string;
  description: string;
  /** `default` — primary empty; `filter` — search/filter with no matches. */
  variant?: 'default' | 'filter';
  /** `compact` — nested panels (rank cards, swipers). */
  density?: 'default' | 'compact';
  actions?: ReadonlyArray<RailFeedEmptyStateAction>;
  className?: string;
  /** When false, no dashed outer panel (open layout). Default true. */
  bordered?: boolean;
}>;

const ACTION_BASE =
  'inline-flex items-center justify-center gap-2 border-2 font-mono text-[10px] font-black uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

const ACTION_VARIANT = {
  primary:
    'border-primary bg-primary px-5 py-2.5 text-primary-foreground shadow hover:brightness-110',
  default: 'border-border bg-background px-4 py-2 text-foreground hover:border-primary',
} as const;

function RailFeedEmptyStateActionButton({
  action,
  emptyVariant,
}: Readonly<{ action: RailFeedEmptyStateAction; emptyVariant: 'default' | 'filter' }>) {
  const tone = action.variant ?? (emptyVariant === 'filter' ? 'primary' : 'default');
  const cls = cn(ACTION_BASE, ACTION_VARIANT[tone]);

  if (action.href) {
    return (
      <Link href={action.href} className={cls} aria-label={action.ariaLabel}>
        {action.icon}
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} onClick={action.onClick} aria-label={action.ariaLabel}>
      {action.icon}
      {action.label}
    </button>
  );
}

/** Empty panel for rail feed pages — soft primary gradient wash (`ss-empty-dashed-panel`), icon, copy, actions. */
export function RailFeedEmptyState({
  icon: Icon,
  title,
  description,
  variant = 'default',
  density = 'default',
  actions,
  className,
  bordered = true,
}: RailFeedEmptyStateProps) {
  const isFilter = variant === 'filter';
  const isCompact = density === 'compact';

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center text-center',
        bordered ? (isCompact ? 'px-4' : 'px-6') : 'px-0',
        bordered && 'ss-empty-dashed-panel border-2 border-dashed border-border',
        isCompact ? 'py-8' : isFilter ? 'py-14' : 'py-16 sm:py-20',
        className
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center border-2 border-border bg-card',
          isCompact
            ? 'size-12 text-primary shadow'
            : isFilter
              ? 'size-14 text-muted-foreground'
              : 'size-16 text-primary shadow'
        )}
      >
        <Icon
          className={isCompact ? 'size-6' : isFilter ? 'size-7' : 'size-8'}
          strokeWidth={2}
          aria-hidden
        />
      </span>
      <p
        className={cn(
          'max-w-sm font-mono font-black uppercase tracking-wide text-foreground',
          isCompact ? 'mt-4 text-xs' : 'text-sm',
          !isCompact && (isFilter ? 'mt-5' : 'mt-6')
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          'mt-2 max-w-md leading-relaxed text-muted-foreground',
          isCompact ? 'text-xs' : 'text-sm'
        )}
      >
        {description}
      </p>
      {actions != null && actions.length > 0 ? (
        <div
          className={cn('flex flex-wrap items-center justify-center gap-2', isCompact ? 'mt-5' : 'mt-8')}
        >
          {actions.map((action, i) => (
            <RailFeedEmptyStateActionButton
              key={action.href ?? action.ariaLabel ?? i}
              action={action}
              emptyVariant={variant}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
