'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { RankCountPill } from '@/components/topics/RankCountPill';
import {
  FOLLOWED_CATEGORIES_STORAGE_KEY,
  isCategorySlugFollowed,
  toggleFollowedCategorySlug,
} from '@/lib/followedCategoriesStorage';
import { cn } from '@/lib/utils';
import { useAuthDialogStore } from '@/store/authDialog';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

const CARD_FRAME =
  'flex h-full min-h-[12rem] flex-col border-2 border-border bg-card p-4 shadow-[4px_4px_0_0_var(--border)]';

export type FeaturedCategoryCardProps = Readonly<{
  slug: string;
  name: string;
  description: string;
  postCount: number;
  /** Destination when opening the category (default: category feed under Topics). */
  href?: string;
  className?: string;
}>;

/**
 * Category tile with title, blurb, post count, and local follow toggle (persisted in `localStorage`).
 */
export function FeaturedCategoryCard({
  slug,
  name,
  description,
  postCount,
  href = `/topics/category/${encodeURIComponent(slug)}`,
  className,
}: FeaturedCategoryCardProps) {
  const token = useAuthStore((s) => s.token);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [following, setFollowing] = useState(false);

  const sync = useCallback(() => {
    setFollowing(isCategorySlugFollowed(slug));
  }, [slug]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FOLLOWED_CATEGORIES_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [sync]);

  const onFollowClick = () => {
    if (!token) {
      openAuth('login');
      return;
    }
    const nowFollowing = toggleFollowedCategorySlug(slug);
    setFollowing(nowFollowing);
    toast.success(nowFollowing ? `Following ${name}` : `Unfollowed ${name}`);
  };

  return (
    <div className={cn(CARD_FRAME, className)}>
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="block min-w-0 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-primary">Category</span>
            <h3 className="mt-1.5 font-mono text-lg font-black uppercase leading-snug tracking-tight text-foreground">
              {name}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-3 font-mono text-[10px] uppercase leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <RankCountPill count={postCount} className="self-start" />
      </div>
      <div className="mt-4">
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={cn(
            'w-full font-mono text-[9px] font-black uppercase tracking-widest active:translate-x-0 active:translate-y-0 active:shadow-sm',
            following && 'border-2 border-primary/30 bg-primary/90 hover:bg-primary',
          )}
          onClick={onFollowClick}
        >
          {following ? 'Following' : 'Follow'}
        </Button>
      </div>
    </div>
  );
}
