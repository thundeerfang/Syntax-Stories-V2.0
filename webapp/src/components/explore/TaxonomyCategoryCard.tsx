'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { Check, UserPlus } from 'lucide-react';
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

const CARD_SHADOW = 'shadow-[4px_4px_0_0_var(--border)]';
const RETRO_BORDER = 'border-2 border-border';

function CategoryFollowCornerButton({
  slug,
  name,
  isHero,
}: Readonly<{ slug: string; name: string; isHero: boolean }>) {
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

  const onFollowClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      openAuth('login');
      return;
    }
    const nowFollowing = toggleFollowedCategorySlug(slug);
    setFollowing(nowFollowing);
    toast.success(nowFollowing ? `Following ${name}` : `Unfollowed ${name}`);
  };

  return (
    <Button
      type="button"
      variant={isHero ? (following ? 'outline' : 'primary') : 'primary'}
      size="sm"
      className={cn(
        'absolute right-2 top-2 z-30 h-9 gap-1 px-2.5 font-mono text-[9px] font-black uppercase tracking-widest active:translate-x-0 active:translate-y-0 active:shadow-sm',
        isHero &&
          !following &&
          'border-0 !bg-primary-foreground !text-primary hover:!opacity-90',
        isHero &&
          following &&
          '!border-primary-foreground !bg-transparent !text-primary-foreground hover:!bg-primary-foreground/10',
        !isHero && following && '!border-primary/30 !bg-primary/90',
      )}
      onClick={onFollowClick}
      aria-pressed={following}
    >
      {following ? (
        <>
          <Check className="size-3.5 shrink-0" strokeWidth={2.75} aria-hidden />
          Followed
        </>
      ) : (
        <>
          <UserPlus className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
          Follow
        </>
      )}
    </Button>
  );
}

export type TaxonomyCategoryCardProps = Readonly<{
  slug: string;
  name: string;
  blurb: string;
  href?: string;
  postCount?: number;
  variant: 'sector-hero' | 'sector-card' | 'compact';
  /** 1-based index shown on sector tiles */
  index?: number;
  className?: string;
}>;

export function TaxonomyCategoryCard({
  slug,
  name,
  blurb,
  href,
  postCount,
  variant,
  index = 1,
  className,
}: TaxonomyCategoryCardProps) {
  const hrefResolved = href ?? `/topics/category/${encodeURIComponent(slug)}`;

  if (variant === 'compact') {
    return (
      <div className={cn('relative flex h-full flex-col bg-card', RETRO_BORDER, CARD_SHADOW, className)}>
        <CategoryFollowCornerButton slug={slug} name={name} isHero={false} />
        <Link
          href={hrefResolved}
          className="flex min-h-0 flex-1 flex-col p-4 pt-12 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:pr-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-primary">Lane</span>
              <h3 className="mt-2 font-mono text-lg font-black uppercase tracking-tight text-foreground">{name}</h3>
              <p className="mt-2 line-clamp-2 font-mono text-[10px] uppercase text-muted-foreground">{blurb}</p>
            </div>
            {typeof postCount === 'number' ? <RankCountPill count={postCount} className="shrink-0" /> : null}
          </div>
        </Link>
      </div>
    );
  }

  const isHero = variant === 'sector-hero';
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden',
        RETRO_BORDER,
        CARD_SHADOW,
        isHero ? 'bg-primary text-primary-foreground md:col-span-2' : 'bg-card',
        className,
      )}
    >
      <CategoryFollowCornerButton slug={slug} name={name} isHero={isHero} />
      <Link
        href={hrefResolved}
        className="relative z-10 block min-h-0 flex-1 p-8 pb-8 pt-10 pr-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:pr-32"
      >
        <span
          className={cn(
            'pointer-events-none absolute -bottom-4 -right-4 font-mono text-[80px] font-black italic opacity-10',
            isHero ? 'text-primary-foreground' : 'text-foreground',
          )}
          aria-hidden
        >
          {String(index).padStart(2, '0')}
        </span>
        <h3 className="relative z-10 mb-4 font-mono text-2xl font-black uppercase sm:text-4xl">{name}</h3>
        <p
          className={cn(
            'relative z-10 mb-6 max-w-xs font-mono text-xs uppercase',
            isHero ? 'text-primary-foreground/90' : 'text-muted-foreground',
          )}
        >
          {blurb}
        </p>
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <span
            className={cn(
              'inline-block border-2 px-4 py-2 font-mono text-[10px] font-bold uppercase',
              isHero ? 'border-primary-foreground' : 'border-primary',
            )}
          >
            Open sector
          </span>
          {typeof postCount === 'number' ? (
            <RankCountPill count={postCount} tone={isHero ? 'inverse' : 'default'} />
          ) : null}
        </div>
      </Link>
    </div>
  );
}
