'use client';

import { cn } from '@/lib/core/utils';
import { useUserPresenceStatus, type UserPresenceStatus } from '@/lib/presence/useUserPresenceStatus';
import { useUIStore } from '@/store/ui';


export type UserPresenceDotProps = Readonly<{
  /** Override auto-detected status (e.g. previews in settings). */
  status?: UserPresenceStatus;
  className?: string;
  /** Accessible label; defaults from status when indicator is visible. */
  title?: string;
}>;

const STATUS_LABEL: Record<UserPresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
};

export function UserPresenceDot({ status: statusProp, className, title }: UserPresenceDotProps) {
  const detected = useUserPresenceStatus();
  const enabled = useUIStore((s) => s.presenceIndicatorEnabled);
  const status = statusProp ?? detected;

  if (!enabled) return null;

  const isOnline = status === 'online';
  const label = title ?? STATUS_LABEL[status];

  return (
    <span
      className={cn(
        'pointer-events-none absolute -bottom-px -right-px z-20 size-2.5 border-2 border-border bg-card',
        isOnline ? 'bg-green-500 presence-dot-blink' : 'bg-muted-foreground/75',
        className,
      )}
      title={label}
      aria-label={label}
      role="status"
    />
  );
}
