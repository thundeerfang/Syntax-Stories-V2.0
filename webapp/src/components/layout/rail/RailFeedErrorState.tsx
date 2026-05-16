'use client';

import { AlertCircle, WifiOff } from 'lucide-react';
import { BlogApiConnectionError } from '@/lib/api/blogAuthFetch';
import { cn } from '@/lib/core/utils';

export function resolveFeedErrorPresentation(
  error: unknown,
  defaults: Readonly<{
    title: string;
    connectionTitle?: string;
    connectionDescription?: string;
    fallbackDescription?: string;
  }>,
): Readonly<{ title: string; description: string; isConnection: boolean }> {
  const isConnection = error instanceof BlogApiConnectionError;
  if (isConnection) {
    return {
      title: defaults.connectionTitle ?? 'Cannot connect to the server',
      description:
        defaults.connectionDescription ?? 'Check your connection and try again.',
      isConnection,
    };
  }
  const detail =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : (defaults.fallbackDescription ?? 'Something went wrong. Please try again.');
  return {
    title: defaults.title,
    description: detail,
    isConnection,
  };
}

export type RailFeedErrorStateProps = Readonly<{
  title: string;
  description?: string;
  error?: unknown | null;
  isConnectionError?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  /** `panel` — dashed block like empty states; `inline` — compact for swipers/sidebars. */
  variant?: 'panel' | 'inline';
}>;

const RETRY_BTN =
  'inline-flex border-2 border-border bg-card px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest shadow transition-transform hover:-translate-y-0.5 hover:bg-muted/40 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none';

function ErrorIconTile({
  isConnection,
  compact,
}: Readonly<{ isConnection: boolean; compact: boolean }>) {
  const Icon = isConnection ? WifiOff : AlertCircle;
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center border-2 border-destructive/45 bg-destructive/10 text-destructive',
        compact ? 'size-12' : 'size-16 shadow-sm',
      )}
      aria-hidden
    >
      <Icon className={compact ? 'size-6' : 'size-8'} strokeWidth={2.25} />
    </span>
  );
}

/** Load-failure panel — red alert icon, copy, optional retry (matches `RailFeedEmptyState` weight). */
export function RailFeedErrorState({
  title,
  description,
  error = null,
  isConnectionError,
  onRetry,
  retryLabel = 'Retry',
  className,
  variant = 'panel',
}: RailFeedErrorStateProps) {
  const resolved = resolveFeedErrorPresentation(error, {
    title,
    fallbackDescription: description,
  });
  const isConn = isConnectionError ?? resolved.isConnection;
  const headline = error != null ? resolved.title : title;
  const body = description ?? (error != null ? resolved.description : undefined);

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className={cn(
          'flex w-full flex-col gap-3 border-2 border-dashed border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-start',
          className,
        )}
      >
        <ErrorIconTile isConnection={isConn} compact />
        <div className="min-w-0 flex-1 space-y-1.5 text-left">
          <p className="font-mono text-xs font-black uppercase tracking-wide text-foreground">{headline}</p>
          {body ? <p className="text-sm leading-relaxed text-muted-foreground">{body}</p> : null}
        </div>
        {onRetry ? (
          <button type="button" onClick={onRetry} className={cn(RETRY_BTN, 'self-start sm:shrink-0')}>
            {retryLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        'ss-empty-dashed-panel relative flex flex-col items-center justify-center border-2 border-dashed border-destructive/40 bg-destructive/5 px-6 py-14 text-center sm:py-16',
        className,
      )}
    >
      <ErrorIconTile isConnection={isConn} compact={false} />
      <p className="mt-6 max-w-sm font-mono text-sm font-black uppercase tracking-wide text-foreground">
        {headline}
      </p>
      {body ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      ) : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className={cn(RETRY_BTN, 'mt-8')}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
