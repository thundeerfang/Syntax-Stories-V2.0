'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { FollowToggleButton } from '@/components/ui/button/FollowToggleButton';
import { FOLLOWED_CATEGORIES_CHANGED_EVENT, isCategorySlugFollowed } from '@/lib/feeds/followedCategoriesStorage';
import { toggleCategoryFollowWithSync } from '@/lib/feeds/categoryFollowActions';
import { triggerFollowConfetti } from '@/store/engagementEffects';
import { useAuthDialogStore } from '@/store/authDialog';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

export type CategoryFollowButtonProps = Readonly<{
  slug: string;
  name: string;
  className?: string;
  /** Called after toggle with the new following state. */
  onToggle?: (nowFollowing: boolean) => void;
}>;

export function CategoryFollowButton({ slug, name, className, onToggle }: CategoryFollowButtonProps) {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? s.user?._id ?? null);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const sync = useCallback(() => {
    setFollowing(isCategorySlugFollowed(slug, userId));
  }, [slug, userId]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const onChanged = () => sync();
    window.addEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
    window.addEventListener('storage', onChanged);
    return () => {
      window.removeEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
      window.removeEventListener('storage', onChanged);
    };
  }, [sync]);

  const onFollowClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!token) {
      openAuth('login');
      return;
    }
    if (busy) return;
    setBusy(true);
    void (async () => {
      try {
        const nowFollowing = await toggleCategoryFollowWithSync(slug, userId, token);
        setFollowing(nowFollowing);
        if (nowFollowing) {
          triggerFollowConfetti(e.currentTarget);
        }
        toast.success(nowFollowing ? `Following ${name}` : `Unfollowed ${name}`);
        onToggle?.(nowFollowing);
      } catch (err) {
        sync();
        toast.error(err instanceof Error ? err.message : 'Could not update follow');
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <FollowToggleButton
      isFollowing={following}
      disabled={busy}
      className={className}
      onClick={onFollowClick}
    />
  );
}
