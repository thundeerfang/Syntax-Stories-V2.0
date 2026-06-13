'use client';

/** Explore feed — owned by features/explore (thin route: app/explore/page.tsx). */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Hash,
  Layers,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { blogApi } from '@/api/blog';
import { squadsApi, type SquadSummary } from '@/api/squads';
import { fetchTagsExplore, type TagExploreRow } from '@/api/tagsExplore';
import { CompactBlogPostsSwiper } from '@/features/blog';
import {
  ExploreHotTagsSkeleton,
  ExploreSectorGridSkeleton,
  ExploreSpotlightSkeleton,
  ExploreTopSquadsSkeleton,
} from '@/components/skeletons';
import { HashtagBadgeLink } from '@/features/tags';
import { Button } from '@/components/ui/button';
import { PanelSectionHeader } from '@/features/explore';
import { RailSectionSubheader, RailFeedEmptyState, ShellPageIntroHeader } from '@/components/layout';
import { RocketLottie } from '@/components/ui/lottie';
import { RankCountPill } from '@/features/topics';
import { SquadDirectoryCard } from '@/features/squads';
import { resolveSquadMediaUrl } from '@/features/squads';
import {
  fetchCategoryFollowersForExplorer,
  resolveMemberAvatarUrl,
  type CategoryMemberPreview,
  type CategoryMembersSnapshot,
} from '@/lib/profile/categoryMembers';
import {
  FOLLOWED_CATEGORIES_CHANGED_EVENT,
  isCategoryFollowedForViewer,
  shouldHandleFollowedCategoriesEvent,
  refreshFollowedCategoriesFromServer,
  toggleCategoryFollowWithSync,
} from '@/lib/feeds/categoryFollowActions';
import { mapPublicFeedPostToPost } from '@/lib/blog/mapFeedPostToPost';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { SQUAD_DISCOVER_CARD_SLIDE_CLASS } from '@/lib/squads/squadDiscoverCardLayout';
import { cn } from '@/lib/core/utils';
import { SPOTLIGHT_PRIMARY_GRADIENT } from '@/lib/shell/spotlightPrimaryGradient';
import type { BlogTaxonomyRow } from '@/types/blog';
import type { Post } from '@/types';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { triggerFollowConfetti } from '@/store/engagementEffects';
import { toast } from 'sonner';

const MAX_FACE_SLOTS = 4;

type CategoryMemberClusterProps = Readonly<{
  isHero?: boolean;
  className?: string;
  members: CategoryMemberPreview[];
  totalCount: number;
  loading?: boolean;
}>;

function MemberAvatar({
  member,
  isHero,
}: Readonly<{ member: CategoryMemberPreview; isHero: boolean }>) {
  return (
    <img
      src={resolveMemberAvatarUrl(member.profileImg, member.username)}
      alt=""
      title={member.username}
      className={cn(
        'size-6 shrink-0  border-2 bg-transparent object-cover',
        isHero ? 'border-primary-foreground/90' : 'border-background'
      )}
    />
  );
}

function OverflowAvatar({ count, isHero }: Readonly<{ count: number; isHero: boolean }>) {
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center  border-2 font-mono text-[8px] font-black leading-none',
        isHero
          ? 'border-primary-foreground/90 bg-primary-foreground/20 text-primary-foreground'
          : 'border-background bg-muted text-primary'
      )}
      aria-hidden
    >
      +{count}
    </span>
  );
}

/** Compact one-line writer avatars + member count for category tiles. */
function CategoryMemberCluster({
  isHero = false,
  className,
  members,
  totalCount,
  loading = false,
}: CategoryMemberClusterProps) {
  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', className)} aria-hidden>
        <div className="flex -space-x-1.5">
          {['sk-a', 'sk-b', 'sk-c'].map((id) => (
            <span key={id} className="size-6 shrink-0 bg-muted/50 animate-pulse" />
          ))}
        </div>
        <span className="h-2.5 w-14 shrink-0 animate-pulse bg-muted/40" />
      </div>
    );
  }

  const membersLabel = `${totalCount.toLocaleString()} ${totalCount === 1 ? 'member' : 'members'}`;
  const overflow = totalCount > MAX_FACE_SLOTS ? totalCount - (MAX_FACE_SLOTS - 1) : 0;
  const faceSlots =
    overflow > 0
      ? [...members.slice(0, MAX_FACE_SLOTS - 1), null]
      : members.slice(0, MAX_FACE_SLOTS);

  return (
    <div
      className={cn('flex min-w-0 items-center gap-2', className)}
      aria-label={`${membersLabel} in this category`}
    >
      {totalCount > 0 ? (
        <>
          <div className="flex shrink-0 items-center -space-x-1.5">
            {faceSlots.map((member) =>
              member ? (
                <MemberAvatar key={member.username} member={member} isHero={isHero} />
              ) : (
                <OverflowAvatar key="overflow" count={overflow} isHero={isHero} />
              )
            )}
          </div>
          <span
            className={cn(
              'shrink-0 font-mono text-[9px] font-black uppercase leading-none tracking-wide',
              isHero ? 'text-primary-foreground' : 'text-primary'
            )}
          >
            {membersLabel}
          </span>
        </>
      ) : (
        <span
          className={cn(
            'font-mono text-[9px] font-black uppercase leading-none tracking-wide',
            isHero ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {membersLabel}
        </span>
      )}
    </div>
  );
}

const TAXONOMY_CARD_SHADOW = 'shadow';
const TAXONOMY_RETRO_BORDER = 'border-2 border-border';

const CATEGORY_CORNER_BTN =
  '!size-9 !min-h-9 !min-w-9 shrink-0 !p-0 active:translate-x-0 active:translate-y-0 active:shadow-none';
const CATEGORY_CORNER_FOLLOW_CLASS = cn(
  CATEGORY_CORNER_BTN,
  '!border-border !bg-white !text-primary hover:!bg-white hover:!text-primary hover:!opacity-90'
);
const CATEGORY_CORNER_OPEN_CLASS = cn(
  CATEGORY_CORNER_BTN,
  '!border-primary !bg-primary !text-white hover:!bg-primary hover:!text-white hover:!opacity-90'
);

function CategoryFollowCornerButton({ slug, name }: Readonly<{ slug: string; name: string }>) {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? s.user?._id ?? null);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const href = `/topics/category/${encodeURIComponent(slug)}`;

  const sync = useCallback(() => {
    setFollowing(isCategoryFollowedForViewer(slug, { token, userId, isHydrated }));
  }, [slug, userId, token, isHydrated]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      if (!shouldHandleFollowedCategoriesEvent(event, userId)) return;
      sync();
    };
    window.addEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
    window.addEventListener('storage', onChanged);
    return () => {
      window.removeEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
      window.removeEventListener('storage', onChanged);
    };
  }, [sync, userId]);

  const onFollowClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || !userId) {
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
      } catch (err) {
        sync();
        toast.error(err instanceof Error ? err.message : 'Could not update follow');
      } finally {
        setBusy(false);
      }
    })();
  };

  if (following) {
    return (
      <Button
        href={href}
        variant="primary"
        size="sm"
        className={cn('absolute right-2 top-2 z-30', CATEGORY_CORNER_OPEN_CLASS)}
        aria-label={`Open ${name}`}
      >
        <ArrowUpRight className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('absolute right-2 top-2 z-30', CATEGORY_CORNER_FOLLOW_CLASS)}
      onClick={onFollowClick}
      aria-label={`Follow ${name}`}
    >
      <UserPlus className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
    </Button>
  );
}

type TaxonomyCategoryCardProps = Readonly<{
  slug: string;
  name: string;
  blurb: string;
  href?: string;
  postCount?: number;
  variant: 'sector-hero' | 'sector-card' | 'compact';
  /** 1-based index shown on sector tiles */
  index?: number;
  membersSnapshot?: CategoryMembersSnapshot;
  membersLoading?: boolean;
  className?: string;
}>;

function TaxonomyCategoryCard({
  slug,
  name,
  blurb,
  href,
  postCount,
  variant,
  index = 1,
  membersSnapshot = { members: [], totalCount: 0 },
  membersLoading = false,
  className,
}: TaxonomyCategoryCardProps) {
  const hrefResolved = href ?? `/topics/category/${encodeURIComponent(slug)}`;

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'relative flex h-full flex-col bg-card',
          TAXONOMY_RETRO_BORDER,
          TAXONOMY_CARD_SHADOW,
          className
        )}
      >
        <CategoryFollowCornerButton slug={slug} name={name} />
        <Link
          href={hrefResolved}
          className="flex min-h-0 flex-1 flex-col p-4 pt-12 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:pr-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-primary">
                Lane
              </span>
              <h3 className="mt-2 font-mono text-lg font-black uppercase tracking-tight text-foreground">
                {name}
              </h3>
              <p className="mt-2 line-clamp-2 font-mono text-[10px] uppercase text-muted-foreground">
                {blurb}
              </p>
            </div>
            {typeof postCount === 'number' ? (
              <RankCountPill count={postCount} className="shrink-0" />
            ) : null}
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
        TAXONOMY_RETRO_BORDER,
        TAXONOMY_CARD_SHADOW,
        isHero ? 'bg-primary text-primary-foreground md:col-span-2' : 'bg-card',
        className
      )}
    >
      <CategoryFollowCornerButton slug={slug} name={name} />
      <Link
        href={hrefResolved}
        className="relative z-10 block min-h-0 flex-1 p-8 pb-8 pt-10 pr-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:pr-32"
      >
        <span
          className={cn(
            'pointer-events-none absolute -bottom-4 -right-4 font-mono text-[80px] font-black italic opacity-10',
            isHero ? 'text-primary-foreground' : 'text-foreground'
          )}
          aria-hidden
        >
          {String(index).padStart(2, '0')}
        </span>
        <h3 className="relative z-10 mb-4 font-mono text-2xl font-black uppercase sm:text-4xl">
          {name}
        </h3>
        <p
          className={cn(
            'relative z-10 mb-4 max-w-xs font-mono text-xs uppercase',
            isHero ? 'text-primary-foreground/90' : 'text-muted-foreground'
          )}
        >
          {blurb}
        </p>
        <div className="relative z-10 mb-4 flex flex-wrap items-center gap-3">
          <span
            className={cn(
              'inline-block border-2 px-4 py-2 font-mono text-[10px] font-bold uppercase',
              isHero ? 'border-primary-foreground' : 'border-primary'
            )}
          >
            Open sector
          </span>
        </div>
        <CategoryMemberCluster
          isHero={isHero}
          className="relative z-10"
          members={membersSnapshot.members}
          totalCount={membersSnapshot.totalCount}
          loading={membersLoading}
        />
      </Link>
    </div>
  );
}

function getScrollStridePx(scroller: HTMLDivElement): number {
  const a = scroller.children.item(0) as HTMLElement | null;
  const b = scroller.children.item(1) as HTMLElement | null;
  if (a && b) return b.offsetLeft - a.offsetLeft;
  if (a) return a.offsetWidth;
  return 0;
}

const laneSwiperNavBtn = cn(
  '!size-10 !min-h-10 !min-w-10 !p-0 !bg-white !text-primary !border-border',
  'hover:!bg-white hover:!text-primary hover:!opacity-90 active:translate-x-0 active:translate-y-0 active:shadow-none'
);

type ExploreTopSquadsBlockProps = Readonly<{
  squads: SquadSummary[];
  loading: boolean;
  joinBusySlug: string | null;
  onJoin: (slug: string) => void | boolean | Promise<void | boolean>;
}>;

function ExploreTopSquadsBlock({
  squads,
  loading,
  joinBusySlug,
  onJoin,
}: ExploreTopSquadsBlockProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const n = squads.length;

  const scrollByStep = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const stride = getScrollStridePx(el);
    if (stride <= 0) return;
    el.scrollBy({ left: dir * stride, behavior: 'smooth' });
  }, []);

  const showArrows = !loading && n > 1;

  return (
    <section className="space-y-4">
      <RailSectionSubheader
        text={
          loading
            ? 'Top squads'
            : n > 0
              ? `Top squads · ${n} ${n === 1 ? 'squad' : 'squads'}`
              : 'Top squads'
        }
        buttons={[
          {
            label: 'View all',
            href: '/squads/featured',
            variant: 'primary',
          },
        ]}
        swiperButtons={
          showArrows ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Scroll squads left"
                onClick={() => scrollByStep(-1)}
                className={laneSwiperNavBtn}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Scroll squads right"
                onClick={() => scrollByStep(1)}
                className={laneSwiperNavBtn}
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </>
          ) : null
        }
      />

      {loading ? (
        <ExploreTopSquadsSkeleton />
      ) : n === 0 ? (
        <RailFeedEmptyState
          icon={UsersRound}
          title="No public squads yet"
          description="Create one from Squads — public groups show up here for others to discover."
          actions={[{ label: 'Open squads', href: '/squads/featured', variant: 'primary' }]}
        />
      ) : (
        <div
          ref={scrollerRef}
          className={cn(
            'ss-scrollbar-hide flex w-full min-w-0 flex-nowrap gap-4 overflow-x-auto pb-1',
            'snap-x snap-mandatory scroll-smooth'
          )}
          role="region"
          aria-label="Top squads"
        >
          {squads.map((s) => (
            <div key={s._id} className={SQUAD_DISCOVER_CARD_SLIDE_CLASS}>
              <SquadDirectoryCard
                squad={s}
                isMember={s.viewerRole != null}
                isAdmin={s.viewerRole === 'admin'}
                joinBusy={joinBusySlug === s.slug}
                onJoin={onJoin}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const SPOTLIGHT_NAV_BTN = cn(
  '!size-11 !min-h-11 !min-w-11 !p-0 !bg-white !text-primary !border-border',
  'hover:!bg-white hover:!text-primary hover:!opacity-90 active:translate-x-0 active:translate-y-0 active:shadow-none'
);
const TRAIL_AUTO_MS = 6500;
const EXPLORE_FEED_LIMIT = 20;

/** Spotlight carousel: live API shapes only (no explore dummy trail). */
type SpotlightItem =
  | { kind: 'squad'; squad: SquadSummary }
  | { kind: 'tag'; tag: { slug: string; name: string; postCount: number } }
  | { kind: 'category'; category: { slug: string; name: string; blurb: string } };

/** Retro / terminal panel tokens */
const RETRO_SHADOW =
  'shadow active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all';
const RETRO_BORDER = 'border-2 border-[var(--border)]';

/** White title with primary glow + offset (readable on all spotlight backdrops). */
const SPOTLIGHT_TITLE_CLASS = cn(
  'mt-5 font-mono text-3xl font-black uppercase leading-none tracking-tighter text-white sm:text-5xl md:text-6xl',
  '[text-shadow:0_0_32px_color-mix(in_srgb,var(--primary)_80%,transparent),0_0_12px_color-mix(in_srgb,var(--primary)_55%,transparent),2px_2px_0_var(--primary),1px_1px_0_rgba(0,0,0,0.9)]'
);

function SpotlightImageBackdrop({ src }: Readonly<{ src: string }>) {
  return (
    <>
      <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      <div
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--background)_18%,transparent)] dark:bg-[color-mix(in_srgb,var(--background)_48%,transparent)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--primary)_22%,transparent),transparent_48%)]"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-background via-background/55 to-transparent"
        aria-hidden
      />
    </>
  );
}

function PrimaryMotionSpotlightBackdrop({ rightAccent }: Readonly<{ rightAccent: ReactNode }>) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <motion.div
        className="absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: SPOTLIGHT_PRIMARY_GRADIENT,
          backgroundSize: '300% 300%',
        }}
        animate={
          reduceMotion
            ? undefined
            : {
                backgroundPosition: ['0% 25%', '92% 68%', '38% 100%', '0% 25%'],
              }
        }
        transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: SPOTLIGHT_PRIMARY_GRADIENT,
          backgroundSize: '280% 280%',
        }}
        animate={
          reduceMotion
            ? undefined
            : {
                backgroundPosition: ['100% 0%', '8% 88%', '72% 42%', '100% 0%'],
                opacity: [0.35, 0.72, 0.48, 0.35],
              }
        }
        transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
      />
      {rightAccent}
      <div
        className="absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-background via-background/45 to-transparent"
        aria-hidden
      />
    </>
  );
}

function TagSpotlightBackdrop() {
  return (
    <PrimaryMotionSpotlightBackdrop
      rightAccent={
        <span
          className="pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 select-none font-mono text-[clamp(6rem,22vw,13rem)] font-black leading-none text-primary-foreground/[0.09]"
          aria-hidden
        >
          #
        </span>
      }
    />
  );
}

function CategorySpotlightBackdrop() {
  return (
    <PrimaryMotionSpotlightBackdrop
      rightAccent={
        <Layers
          className="pointer-events-none absolute -right-1 top-1/2 size-[clamp(5.5rem,20vw,11rem)] -translate-y-1/2 text-primary-foreground/[0.09]"
          strokeWidth={1.15}
          aria-hidden
        />
      }
    />
  );
}

function SquadSpotlightBackdrop() {
  return (
    <PrimaryMotionSpotlightBackdrop
      rightAccent={
        <UsersRound
          className="pointer-events-none absolute -right-1 top-1/2 size-[clamp(5.5rem,20vw,11rem)] -translate-y-1/2 text-primary-foreground/[0.09]"
          strokeWidth={1.15}
          aria-hidden
        />
      }
    />
  );
}

function SpotlightBackdrop({ item }: Readonly<{ item: SpotlightItem }>) {
  if (item.kind === 'squad') {
    const banner = resolveSquadMediaUrl(item.squad.coverBannerUrl);
    return banner ? <SpotlightImageBackdrop src={banner} /> : <SquadSpotlightBackdrop />;
  }
  if (item.kind === 'category') {
    return <CategorySpotlightBackdrop />;
  }
  return <TagSpotlightBackdrop />;
}

function TrailBadge({ kind }: Readonly<{ kind: SpotlightItem['kind'] }>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 border-2 border-white bg-white px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-primary shadow'
      )}
    >
      {kind === 'squad' ? (
        <UsersRound className="size-3" aria-hidden />
      ) : kind === 'tag' ? (
        <Hash className="size-3" aria-hidden />
      ) : (
        <Layers className="size-3" aria-hidden />
      )}
      {kind}
    </span>
  );
}

function trailHref(item: SpotlightItem): string {
  if (item.kind === 'squad') return `/squads/${encodeURIComponent(item.squad.slug)}`;
  if (item.kind === 'tag') return `/topics/${encodeURIComponent(item.tag.slug)}`;
  return `/topics/category/${encodeURIComponent(item.category.slug)}`;
}

function trailCtaLabel(kind: SpotlightItem['kind']): string {
  if (kind === 'squad') return 'Open squad';
  if (kind === 'tag') return 'Open tag stream';
  return 'Open category';
}

function squadSpotlightIcon(s: SquadSummary): ReactNode {
  const base = resolvePublicApiBase().replace(/\/$/, '');
  const raw = s.iconUrl?.trim();
  let src: string | undefined;
  if (raw?.startsWith('http://') || raw?.startsWith('https://') || raw?.startsWith('data:')) {
    src = raw;
  } else if (raw) {
    src = `${base}${raw.startsWith('/') ? '' : '/'}${raw}`;
  }
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="mr-2 inline-block size-11 shrink-0 border-2 border-border object-cover align-middle sm:size-12"
      />
    );
  }
  return (
    <UsersRound
      className="mr-2 inline-block size-10 shrink-0 align-middle text-white sm:size-11"
      strokeWidth={2}
      aria-hidden
    />
  );
}

function mergeHotTags(
  popular: TagExploreRow[],
  trending: TagExploreRow[],
  limit: number
): TagExploreRow[] {
  const seen = new Set<string>();
  const out: TagExploreRow[] = [];
  for (const row of [...trending, ...popular]) {
    const k = row.slug.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

async function mergeSquadsWithMembership(
  squads: SquadSummary[],
  token: string | null
): Promise<SquadSummary[]> {
  if (!token) return squads;
  try {
    const { squads: mine } = await squadsApi.listMine(token);
    const roles = new Map(mine.map((s) => [s.slug, s.viewerRole ?? ('member' as const)]));
    return squads.map((s) => {
      const role = roles.get(s.slug);
      return role ? { ...s, viewerRole: role } : s;
    });
  } catch {
    return squads;
  }
}

function buildSpotlightItems(
  tagsEx: { trending: TagExploreRow[]; popular: TagExploreRow[] },
  squads: SquadSummary[],
  categories: BlogTaxonomyRow[]
): SpotlightItem[] {
  const squadItems: SpotlightItem[] = squads
    .filter((s) => s.visibility === 'public')
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 4)
    .map((s) => ({ kind: 'squad' as const, squad: s }));

  const trending = tagsEx.trending.length ? tagsEx.trending : tagsEx.popular;
  const tagItems: SpotlightItem[] = trending.slice(0, 5).map((t) => ({
    kind: 'tag' as const,
    tag: { slug: t.slug, name: t.name, postCount: t.postCount },
  }));

  const catItems: SpotlightItem[] = [...categories]
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 4)
    .map((c) => ({
      kind: 'category' as const,
      category: {
        slug: c.slug,
        name: c.name,
        blurb: c.description?.trim() ? c.description.trim() : `Stories filed under ${c.name}.`,
      },
    }));

  const out: SpotlightItem[] = [];
  const maxLoop = Math.max(squadItems.length, tagItems.length, catItems.length);
  for (let i = 0; i < maxLoop; i++) {
    if (squadItems[i]) out.push(squadItems[i]!);
    if (tagItems[i]) out.push(tagItems[i]!);
    if (catItems[i]) out.push(catItems[i]!);
  }
  return out.slice(0, 14);
}

function ExploreFeaturedTrail({
  items,
  loading,
}: Readonly<{
  items: SpotlightItem[];
  loading: boolean;
}>) {
  const reduceMotion = useReducedMotion();
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (n <= 1) return;
    setIndex((i) => Math.min(i, n - 1));
  }, [n]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      setIndex((i) => (i + dir + n) % n);
    },
    [n]
  );

  useEffect(() => {
    if (reduceMotion || n <= 1 || paused) return;
    const id = globalThis.setInterval(() => setIndex((i) => (i + 1) % n), TRAIL_AUTO_MS);
    return () => globalThis.clearInterval(id);
  }, [n, paused, reduceMotion]);

  const item = n > 0 ? items[Math.min(index, n - 1)]! : null;
  const slideKey =
    item == null
      ? 'empty'
      : `${item.kind}-${item.kind === 'squad' ? item.squad.slug : item.kind === 'tag' ? item.tag.slug : item.category.slug}`;
  const t = reduceMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const };

  if (loading) {
    return <ExploreSpotlightSkeleton />;
  }

  if (!item) {
    return (
      <section className="relative w-full min-w-0">
        <div
          className={cn(
            'relative flex min-h-[220px] w-full flex-col items-start justify-center gap-4 overflow-hidden bg-card p-6 md:min-h-[260px] md:p-10',
            RETRO_BORDER,
            'shadow'
          )}
        >
          <p className="font-mono text-sm font-black uppercase text-muted-foreground">
            No spotlight items yet
          </p>
          <p className="max-w-md text-xs uppercase leading-relaxed text-muted-foreground">
            Publish posts with tags, create squads, or open topics — this carousel fills from live
            taxonomy and the public directory.
          </p>
          <Link
            href="/topics"
            className={cn(
              'inline-flex items-center gap-2 bg-[var(--primary)] px-6 py-3 font-mono text-xs font-bold uppercase text-[var(--background)]',
              RETRO_SHADOW
            )}
          >
            Browse topics <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="group relative w-full min-w-0"
      aria-roledescription="carousel"
      aria-label="Featured squads, tags, and categories"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={cn(
          'relative flex min-h-[min(48vh,380px)] w-full flex-col justify-end overflow-hidden bg-[var(--background)] p-6 md:min-h-[360px] md:p-10',
          RETRO_BORDER,
          'shadow'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`bg-${slideKey}`}
            className="absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t}
            aria-hidden
          >
            <SpotlightBackdrop item={item} />
          </motion.div>
        </AnimatePresence>

        <div
          className="pointer-events-none absolute inset-0 z-[5] bg-[length:100%_2px,3px_100%] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] opacity-10 dark:opacity-[0.14]"
          aria-hidden
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slideKey}
            role="group"
            aria-roledescription="slide"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
            transition={t}
            className="relative z-20"
          >
            <TrailBadge kind={item.kind} />

            <h3 className={SPOTLIGHT_TITLE_CLASS}>
              {item.kind === 'squad' ? (
                <>
                  {squadSpotlightIcon(item.squad)}
                  {item.squad.name}
                </>
              ) : item.kind === 'tag' ? (
                `#${item.tag.name}`
              ) : (
                item.category.name
              )}
            </h3>

            <p className="mt-4 max-w-xl font-mono text-sm uppercase leading-relaxed text-[var(--muted-foreground)]">
              {item.kind === 'squad'
                ? item.squad.description
                : item.kind === 'tag'
                  ? `${item.tag.postCount.toLocaleString()} posts indexed under this tag.`
                  : item.category.blurb}
            </p>

            {item.kind === 'squad' ? (
              <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                {item.squad.memberCount.toLocaleString()} members · {item.squad.visibility} node
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                href={trailHref(item)}
                variant="primary"
                size="lg"
                className="font-mono text-xs font-bold uppercase"
              >
                {trailCtaLabel(item.kind)}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute right-6 top-6 z-30 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Previous spotlight"
            onClick={() => go(-1)}
            disabled={n <= 1}
            className={SPOTLIGHT_NAV_BTN}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Next spotlight"
            onClick={() => go(1)}
            disabled={n <= 1}
            className={SPOTLIGHT_NAV_BTN}
          >
            <ChevronRight className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      {n > 1 ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
              className={cn(
                'h-2  border-2 border-[var(--border)] transition-[width,background-color] duration-300',
                i === index
                  ? 'w-8 bg-[var(--primary)]'
                  : 'w-2 bg-[var(--card)] hover:bg-[var(--muted)]'
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ExplorePage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? user?._id ?? null;
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [exploreJoinBusySlug, setExploreJoinBusySlug] = useState<string | null>(null);
  const spotlightRequestRef = useRef(0);

  const [spotlightItems, setSpotlightItems] = useState<SpotlightItem[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(true);
  const [hotTags, setHotTags] = useState<TagExploreRow[]>([]);

  const [topPublicSquads, setTopPublicSquads] = useState<SquadSummary[]>([]);

  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<unknown | null>(null);
  const [taxonomyCats, setTaxonomyCats] = useState<BlogTaxonomyRow[]>([]);
  const [categoryMembersBySlug, setCategoryMembersBySlug] = useState<
    Record<string, CategoryMembersSnapshot>
  >({});
  const [categoryMembersLoading, setCategoryMembersLoading] = useState(true);
  const [categoryMembersRevision, setCategoryMembersRevision] = useState(0);

  useEffect(() => {
    const bump = () => setCategoryMembersRevision((n) => n + 1);
    window.addEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, bump);
    return () => window.removeEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, bump);
  }, []);

  const loadSpotlightAndTags = useCallback(async (opts?: { silent?: boolean }) => {
    const requestId = ++spotlightRequestRef.current;
    if (!opts?.silent) {
      setSpotlightLoading(true);
    }
    try {
      const activeToken = useAuthStore.getState().token;
      const [tagsEx, squadsRes, tax] = await Promise.all([
        fetchTagsExplore(),
        squadsApi.listPublic({ limit: 120 }),
        blogApi.getTaxonomy(),
      ]);
      if (requestId !== spotlightRequestRef.current) return;

      const squadsWithMembership = await mergeSquadsWithMembership(squadsRes.squads, activeToken);
      if (requestId !== spotlightRequestRef.current) return;

      const cats = tax.categories ?? [];
      setTaxonomyCats(cats);
      setHotTags(mergeHotTags(tagsEx.popular, tagsEx.trending, 14));
      setSpotlightItems(buildSpotlightItems(tagsEx, squadsWithMembership, cats));
      const topSorted = squadsWithMembership
        .filter((s) => s.visibility === 'public')
        .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name));
      setTopPublicSquads(topSorted.slice(0, 24));
    } catch {
      if (requestId !== spotlightRequestRef.current) return;
      setTaxonomyCats([]);
      setHotTags([]);
      setSpotlightItems([]);
      setTopPublicSquads([]);
    } finally {
      if (requestId === spotlightRequestRef.current) {
        setSpotlightLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadSpotlightAndTags();
  }, [loadSpotlightAndTags]);

  useEffect(() => {
    if (!isHydrated) return;
    return useAuthStore.subscribe((state, prev) => {
      if (state.token !== prev.token) {
        void loadSpotlightAndTags({ silent: true });
      }
    });
  }, [isHydrated, loadSpotlightAndTags]);

  const sectorPreview = useMemo(
    () =>
      [...taxonomyCats]
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, 5)
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          blurb: c.description?.trim()
            ? c.description.trim()
            : `Writers filing stories under ${c.name}.`,
          postCount: c.postCount,
        })),
    [taxonomyCats]
  );

  const sectorPreviewSlugsKey = useMemo(
    () => sectorPreview.map((c) => c.slug).join('\0'),
    [sectorPreview]
  );

  useEffect(() => {
    const slugs = sectorPreviewSlugsKey ? sectorPreviewSlugsKey.split('\0') : [];
    if (slugs.length === 0) {
      setCategoryMembersBySlug({});
      setCategoryMembersLoading(false);
      return;
    }

    let cancelled = false;
    setCategoryMembersLoading(true);

    void (async () => {
      const activeToken = useAuthStore.getState().token;
      const activeUserId =
        useAuthStore.getState().user?.id ?? useAuthStore.getState().user?._id ?? null;

      if (activeToken && activeUserId) {
        try {
          await refreshFollowedCategoriesFromServer(activeUserId, activeToken);
        } catch {
          /* keep local list */
        }
      }

      const next = await fetchCategoryFollowersForExplorer(slugs, async (categorySlugs) => {
        const { categories } = await blogApi.getCategoryMembersPreview(categorySlugs);
        return categories;
      });

      if (!cancelled) {
        setCategoryMembersBySlug(next);
        setCategoryMembersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sectorPreview, sectorPreviewSlugsKey, userId, categoryMembersRevision]);

  useEffect(() => {
    const bump = () => setCategoryMembersRevision((n) => n + 1);
    window.addEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, bump);
    return () => window.removeEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, bump);
  }, []);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const activeToken = useAuthStore.getState().token;
      const { posts: raw } = await blogApi.getPublishedFeed(
        EXPLORE_FEED_LIMIT,
        undefined,
        activeToken
      );
      setFeedPosts(raw.map(mapPublicFeedPostToPost));
    } catch (e) {
      setFeedError(e);
      setFeedPosts([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const bufferSwiperPosts = useMemo(() => feedPosts.slice(0, 12), [feedPosts]);

  const handleExploreTopJoin = useCallback(
    async (squadSlug: string): Promise<boolean> => {
      if (!token) {
        openAuth('login');
        return false;
      }
      setExploreJoinBusySlug(squadSlug);
      try {
        await squadsApi.join(squadSlug, token);
        toast.success('Joined squad');
        setTopPublicSquads((prev) =>
          prev.map((s) => (s.slug === squadSlug ? { ...s, viewerRole: 'member' as const } : s))
        );
        await loadSpotlightAndTags({ silent: true });
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not join');
        throw e;
      } finally {
        setExploreJoinBusySlug(null);
      }
    },
    [token, openAuth, loadSpotlightAndTags]
  );

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col gap-10 md:gap-12')}>
      <ShellPageIntroHeader
        breadcrumbItems={[{ href: '/', label: 'Home' }, { label: 'Explore' }]}
        description="Squads, sector categories, hot tags, and the latest transmissions from across the network."
        title={
          <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-black uppercase italic tracking-tighter text-foreground sm:text-3xl lg:text-4xl">
            <RocketLottie autoplay size={40} />
            Explore
          </h1>
        }
        className="!space-y-3 md:!space-y-4"
      />

      <ExploreFeaturedTrail items={spotlightItems} loading={spotlightLoading} />

      <ExploreTopSquadsBlock
        squads={topPublicSquads}
        loading={spotlightLoading}
        joinBusySlug={exploreJoinBusySlug}
        onJoin={handleExploreTopJoin}
      />

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-stretch lg:gap-6">
        <div className="flex min-h-0 lg:col-span-1">
          <div
            className="flex h-full min-h-0 w-full flex-col border-2 border-border bg-card p-4 shadow sm:p-5"
            aria-busy={spotlightLoading}
          >
            <div className="shrink-0">
              <PanelSectionHeader
                eyebrow="Metadata"
                title="Hot tags"
                description="Live from published posts — each pill opens the tag stream."
              />
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-hidden">
              <div className="ss-scrollbar-hide h-full min-h-0 overflow-y-auto">
                <div className="flex flex-wrap content-start gap-2">
                  {spotlightLoading ? (
                    <ExploreHotTagsSkeleton />
                  ) : hotTags.length === 0 ? (
                    <p className="w-full text-[10px] font-mono uppercase text-muted-foreground">
                      No tagged posts yet.
                    </p>
                  ) : (
                    hotTags.map((tag) => (
                      <HashtagBadgeLink
                        key={tag.slug}
                        slug={tag.slug}
                        label={tag.name}
                        postCount={tag.postCount}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-auto w-full shrink-0 pt-3">
              {spotlightLoading ? (
                <div
                  className="h-12 w-full animate-pulse border-2 border-border bg-muted/40"
                  aria-hidden
                />
              ) : (
                <Button
                  href="/topics"
                  variant="primary"
                  size="lg"
                  className="flex w-full justify-center font-mono text-[11px] font-black uppercase shadow-none sm:text-xs"
                >
                  View all
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-col lg:col-span-2">
          <CompactBlogPostsSwiper
            className="flex h-full min-h-0 flex-col"
            mode="rail"
            posts={bufferSwiperPosts}
            loading={feedLoading}
            error={feedError}
            onRetry={loadFeed}
            aria-label="Latest published stories"
            headerStart={
              <>
                <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping bg-primary opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2.5 w-2.5 bg-primary" />
                </span>
                <h3 className="min-w-0 truncate font-mono text-sm font-black uppercase text-muted-foreground">
                  Latest buffer transmissions
                </h3>
              </>
            }
          />
        </div>
      </section>

      <section className="space-y-4">
        <RailSectionSubheader
          text={
            spotlightLoading
              ? 'Sector categories'
              : sectorPreview.length > 0
                ? `Sector categories · ${sectorPreview.length} ${sectorPreview.length === 1 ? 'sector' : 'sectors'}`
                : 'Sector categories'
          }
          buttons={[
            {
              label: 'View all',
              href: '/topics',
              variant: 'primary',
            },
          ]}
        />
        {spotlightLoading ? (
          <ExploreSectorGridSkeleton />
        ) : sectorPreview.length === 0 ? (
          <RailFeedEmptyState
            icon={Layers}
            title="No taxonomy sectors loaded yet"
            description="When categories are published in the taxonomy, sector previews will appear here."
            actions={[{ label: 'Browse topics', href: '/topics', variant: 'primary' }]}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {sectorPreview.map((cat, idx: number) => (
              <TaxonomyCategoryCard
                key={cat.slug}
                slug={cat.slug}
                name={cat.name}
                blurb={cat.blurb}
                postCount={cat.postCount}
                href={`/topics/category/${encodeURIComponent(cat.slug)}`}
                variant={idx === 0 ? 'sector-hero' : 'sector-card'}
                index={idx + 1}
                membersSnapshot={
                  categoryMembersBySlug[cat.slug.toLowerCase()] ?? { members: [], totalCount: 0 }
                }
                membersLoading={categoryMembersLoading}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
