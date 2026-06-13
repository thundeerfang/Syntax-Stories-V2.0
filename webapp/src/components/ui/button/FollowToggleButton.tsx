'use client';

import type { MouseEvent } from 'react';
import { Button } from './buttons';
import { cn } from '@/lib/core/utils';

export const followToggleButtonClassName =
  'shrink-0 font-mono text-[10px] font-black uppercase tracking-widest active:translate-x-0 active:translate-y-0 active:shadow-none';

export type FollowToggleButtonProps = Readonly<{
  isFollowing: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  followLabel?: string;
  unfollowLabel?: string;
  className?: string;
}>;

/** Retro Follow / Unfollow control — shared by topics, profile dialogs, and squad leave. */
export function FollowToggleButton({
  isFollowing,
  onClick,
  disabled = false,
  followLabel = 'Follow',
  unfollowLabel = 'Unfollow',
  className,
}: FollowToggleButtonProps) {
  const label = isFollowing ? unfollowLabel : followLabel;

  return (
    <Button
      type="button"
      variant={isFollowing ? 'outline' : 'primary'}
      size="sm"
      disabled={disabled}
      className={cn(
        followToggleButtonClassName,
        isFollowing && 'border-2 border-primary bg-primary/10 text-primary hover:bg-primary/15',
        className
      )}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
