'use client';

/** Trending feed — owned by features/trending (thin route: app/trending/page.tsx). */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Layers,
  Repeat2,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { blogApi } from '@/api/blog';
import { fetchCategoriesList } from '@/api/tagsExplore';
import { CompactBlogPostsSwiper, type CompactBlogPostsSwiperHandle } from '@/features/blog';
import { Button } from '@/components/ui/button';
import {
  RailFeedEmptyState,
  RailFeedErrorState,
  RailSectionSubheader,
  RailCountPill,
  RailCountPillLoading,
  RailCountPillPair,
  ShellPageIntroHeader,
  type RailSectionSubheaderSortProps,
} from '@/components/layout';
import { FireLottie } from '@/components/ui/lottie';
import { mapPublicFeedPostToPost } from '@/lib/blog/mapFeedPostToPost';
import { PrimaryCoverFallback } from '@/lib/shell/primaryCoverFallback';
import { TrendingCategoryLaneSkeleton, TrendingStackedHeroSkeleton } from '@/components/skeletons';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';
import type { BlogTaxonomyRow } from '@/types/blog';
import type { Post } from '@/types';
import { useAuthStore } from '@/store/auth';

const AUTOPLAY_MS = 7000;
const STACK_DEPTH = 5;

function postHref(post: Post): string {
  const u = post.author.username ?? post.author.id;
  return `/blogs/${encodeURIComponent(u)}/${encodeURIComponent(post.slug)}`;
}

function titleCaseEveryWord(raw: string): string {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^[\d:.]+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function slugToTagChips(slug: string, maxTags = 1): string[] {
  const parts = slug.split('-').filter((p) => p.length > 1);
  return parts.slice(0, maxTags).map((p) => (p.length > 14 ? `${p.slice(0, 12)}…` : p));
}

function titleCaseFromSlug(token: string): string {
  return token
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function categoryLabel(post: Post): string {
  if (post.category?.trim()) return titleCaseFromSlug(post.category.trim());
  const t = post.tags?.find((x) => typeof x === 'string' && x.trim());
  if (t) return t.trim().charAt(0).toUpperCase() + t.trim().slice(1).toLowerCase();
  const fromSlug = slugToTagChips(post.slug, 1)[0];
  if (fromSlug) return titleCaseFromSlug(fromSlug);
  return 'Blog';
}

function formatEngagementCount(n: number): string {
  if (n > 99) return '99+';
  return String(Math.max(0, n));
}

function TrendingHeroEngagementStrip({
  post,
  stacked = false,
}: Readonly<{
  post: Post;
  stacked?: boolean;
}>) {
  const respect = post.respectCount ?? 0;
  const reposts = post.repostCount ?? 0;
  const bookmarks = post.bookmarkCount ?? 0;
  const username = post.author.username ?? post.author.id;
  const excerpt = post.excerpt?.trim();

  const avatarSize = stacked ? 'size-9' : 'size-9 sm:size-10';

  const statClass =
    'inline-flex items-center gap-0.5 font-mono text-[10px] font-black tabular-nums text-white sm:text-[11px]';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[25] flex flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {post.author.image ? (
          <img
            src={post.author.image}
            alt=""
            className={cn(avatarSize, 'shrink-0  border-2 border-white/90 object-cover')}
          />
        ) : (
          <div
            className={cn(
              avatarSize,
              'flex shrink-0 items-center justify-center  border-2 border-white/90 bg-white/15 font-mono text-sm font-black text-white'
            )}
            aria-hidden
          >
            {(post.author.name || username).slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[10px] font-black uppercase tracking-wide text-white">
            {post.author.name}
          </p>
          {username ? (
            <p className="truncate font-mono text-[9px] font-bold uppercase tracking-wider text-white/75">
              @{username}
            </p>
          ) : null}
        </div>
      </div>

      <p
        className={cn(
          'line-clamp-2 min-w-0 w-full break-words text-left font-sans font-black leading-snug tracking-tight text-white',
          stacked
            ? 'max-w-[11.5rem] text-sm sm:max-w-[13rem] sm:text-base'
            : 'max-w-[16rem] text-base sm:max-w-[22rem] md:max-w-[28rem] sm:text-lg'
        )}
        title={post.title}
      >
        {titleCaseEveryWord(post.title)}
      </p>

      {excerpt ? (
        <p
          className={cn(
            'line-clamp-2 min-w-0 font-mono text-[10px] uppercase leading-relaxed text-white/80 sm:text-[11px]',
            stacked
              ? 'max-w-[11.5rem] sm:max-w-[13rem]'
              : 'max-w-[16rem] sm:max-w-[22rem] md:max-w-[28rem]'
          )}
        >
          {excerpt}
        </p>
      ) : null}

      <div
        className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-white/95"
        aria-label={`Engagement: ${respect} respects, ${reposts} reposts, ${bookmarks} bookmarks`}
      >
        <span className={statClass} title="Respects">
          <img
            src="/svg/icons8-lightning-bolt.svg"
            alt=""
            className="size-3.5 object-contain opacity-95"
          />
          {formatEngagementCount(respect)}
        </span>
        <span className="text-white/35" aria-hidden>
          ·
        </span>
        <span className={statClass} title="Reposts">
          <Repeat2 className="size-3.5 shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
          {formatEngagementCount(reposts)}
        </span>
        <span className="text-white/35" aria-hidden>
          ·
        </span>
        <span className={statClass} title="Bookmarks">
          <Bookmark className="size-3.5 shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
          {formatEngagementCount(bookmarks)}
        </span>
      </div>
    </div>
  );
}

type TrendingStackedHeroProps = Readonly<{
  posts: Post[];
  loading: boolean;
  error: unknown | null;
  onRetry: () => void;
  emptyHeadline?: string;
  emptySub?: string;
}>;

/** Left-anchored active card; inactive deck stacks behind on the right (overlap peek). */
function TrendingStackedHero({
  posts,
  loading,
  error,
  onRetry,
  emptyHeadline = 'No published posts yet',
  emptySub = 'When writers publish, trending picks will stack here.',
}: TrendingStackedHeroProps) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  /** Drives a one-shot “promoted to front” animation only when a stacked card is clicked. */
  const [frontPromoteAnim, setFrontPromoteAnim] = useState(false);
  const n = posts.length;
  const safe = n > 0 ? active % n : 0;

  useEffect(() => {
    setActive(0);
    setFrontPromoteAnim(false);
  }, [posts]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      setFrontPromoteAnim(false);
      setActive((i) => (i + dir + n) % n);
    },
    [n]
  );

  useEffect(() => {
    if (reduceMotion || n <= 1 || paused || loading) return;
    const id = globalThis.setInterval(() => {
      go(1);
    }, AUTOPLAY_MS);
    return () => globalThis.clearInterval(id);
  }, [n, paused, loading, reduceMotion, go]);

  useEffect(() => {
    if (!frontPromoteAnim) return undefined;
    const ms = reduceMotion ? 0 : 430;
    const id = globalThis.setTimeout(() => setFrontPromoteAnim(false), ms);
    return () => globalThis.clearTimeout(id);
  }, [safe, frontPromoteAnim, reduceMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [go]);

  if (loading) {
    return <TrendingStackedHeroSkeleton />;
  }

  if (error != null) {
    return <RailFeedErrorState title="Could not load trending" error={error} onRetry={onRetry} />;
  }

  if (n === 0) {
    return (
      <RailFeedEmptyState
        icon={Layers}
        title={emptyHeadline}
        description={emptySub}
        className="min-h-[20rem] justify-center sm:min-h-[23rem] md:min-h-[26rem]"
        actions={[
          {
            label: 'Browse topics',
            href: '/topics',
            variant: 'primary',
            icon: <Compass className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />,
          },
          {
            label: 'Explore',
            href: '/explore',
            variant: 'default',
          },
        ]}
      />
    );
  }

  const visible = Math.min(STACK_DEPTH, n);
  const stackSpring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 540, damping: 32, mass: 0.62 };

  const frontPromoteTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] as const };

  /** Taller hero strip (all stacked cards share this height). */
  const STAGE_H = 'h-[20rem] sm:h-[23rem] md:h-[26rem]';

  const FRONT_WIDTH_PCT = 64;

  function backStackStyle(depth: number, stackVisible: number, frontW: number): CSSProperties {
    const maxBackDepth = stackVisible - 1;

    if (maxBackDepth <= 0) {
      return {
        right: '3%',
        width: '32%',
      };
    }

    const FRONT_RIGHT_EDGE = frontW;

    /** First back: larger `right` + underlap tucks more of the card under the left hero. */
    if (depth === 1) {
      return {
        right: '8%',
        width: `${100 - FRONT_RIGHT_EDGE + 17}%`,
      };
    }

    if (depth === 2) {
      return {
        right: '0.5%',
        width: `${34 - 4}%`,
      };
    }

    const step = depth - 1;

    return {
      right: `${2 + step * 1.4}%`,
      width: `${34 - step * 4}%`,
    };
  }

  return (
    <section
      className="relative w-full min-w-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Trending stories stack"
    >
      <div className="relative mx-auto w-full">
        <div className={cn('relative isolate w-full overflow-visible', STAGE_H)}>
          {Array.from({ length: visible }, (_, d) => {
            const depth = visible - 1 - d;
            const post = posts[(safe + depth) % n];
            const href = postHref(post);
            const cover = post.coverImage;
            const title = titleCaseEveryWord(post.title);
            const cat = categoryLabel(post);
            const isFront = depth === 0;
            /** Slightly smaller back cards for depth hierarchy. */
            const backCardScale = isFront ? 1 : Math.max(0.82, 1 - depth * 0.045);
            const z = 55 - depth;
            const rotateY = 0;
            const rotateZ = 0;
            const fanX = 0;

            const postIndex = (safe + depth) % n;
            const trendingRank = postIndex + 1;

            /** Cover + scrims + badges; strip is a sibling so stacked actions stay usable. */
            const mediaBlock = (
              <div className={cn('relative w-full overflow-hidden bg-muted', STAGE_H)}>
                {cover ? (
                  <img src={cover} alt="" className="h-full w-full object-cover object-center" />
                ) : (
                  <PrimaryCoverFallback variant="blog" label="No cover" />
                )}
                {isFront ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 top-[34%] z-[3] bg-linear-to-t from-black/90 via-black/48 to-transparent"
                    aria-hidden
                  />
                ) : (
                  <div
                    className="pointer-events-none absolute inset-0 z-[3] bg-linear-to-t from-black/70 via-black/26 to-black/05"
                    aria-hidden
                  />
                )}
                <span className="pointer-events-none absolute left-2 top-2 z-[6] max-w-[52%] truncate border-2 border-primary bg-primary px-2 py-0.5 font-sans text-[9px] font-black uppercase tracking-wide text-primary-foreground shadow sm:left-2.5 sm:top-2.5 sm:text-[10px]">
                  {cat}
                </span>
                <span
                  className="pointer-events-none absolute right-2 top-2 z-[6] border-2 border-border bg-background px-2 py-1 font-mono text-[10px] font-black tabular-nums text-foreground shadow"
                  aria-hidden
                >
                  #{trendingRank}
                </span>
              </div>
            );

            const cardBody = (
              <div className="relative h-full w-full">
                {mediaBlock}
                {isFront ? (
                  <Link
                    href={href}
                    className="absolute inset-x-0 top-0 bottom-[48%] z-[14] block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    aria-label={`Open ${title}`}
                  />
                ) : (
                  <button
                    type="button"
                    className="absolute inset-x-0 top-0 bottom-[48%] z-[12] cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    aria-label={`Bring to front: ${title}`}
                    onClick={() => {
                      setFrontPromoteAnim(true);
                      setActive((safe + depth) % n);
                    }}
                  />
                )}
                <TrendingHeroEngagementStrip post={post} stacked={!isFront} />
              </div>
            );

            const positionStyle: CSSProperties = isFront
              ? {
                  left: 0,
                  width: `${FRONT_WIDTH_PCT}%`,
                  top: '50%',
                }
              : {
                  ...backStackStyle(depth, visible, FRONT_WIDTH_PCT),
                  top: '50%',
                };

            return (
              <motion.div
                key={depth}
                className="absolute cursor-default"
                style={{
                  zIndex: z,
                  transformOrigin: isFront ? 'left center' : 'right center',
                  ...positionStyle,
                }}
                initial={false}
                animate={{
                  y: '-50%',
                  x: isFront ? 0 : fanX,
                  scale: backCardScale,
                  rotateY,
                  rotateZ,
                }}
                transition={stackSpring}
              >
                <div
                  className={cn(
                    'h-full w-full overflow-hidden  border-2 border-border bg-background shadow',
                    isFront && 'shadow'
                  )}
                >
                  {isFront ? (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={post.id}
                        className="h-full w-full"
                        initial={
                          reduceMotion || !frontPromoteAnim
                            ? false
                            : {
                                opacity: 0,
                                scale: 0.985,
                                boxShadow:
                                  '0 0 0 10px rgba(255,255,255,0.92), 0 0 0 14px rgba(255,255,255,0.35), 0 18px 48px rgba(0,0,0,0.35)',
                              }
                        }
                        animate={{
                          opacity: 1,
                          scale: 1,
                          boxShadow: '0 0 0 0 rgba(0,0,0,0)',
                        }}
                        exit={{ opacity: 1, transition: { duration: 0 } }}
                        transition={frontPromoteTransition}
                      >
                        {cardBody}
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    cardBody
                  )}
                </div>
              </motion.div>
            );
          })}

          {n > 1 ? (
            <motion.div
              className="absolute left-0 top-0 z-[22] cursor-grab active:cursor-grabbing"
              style={{
                width: `${FRONT_WIDTH_PCT}%`,
                bottom: '14rem',
                left: 0,
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(_, info) => {
                const x = info.offset.x + info.velocity.x * 0.12;
                if (x < -52) go(1);
                else if (x > 52) go(-1);
              }}
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

const GLOBAL_HERO_LIMIT = 14;
const CATEGORY_PAGE_SIZE = 3;
const LANE_INITIAL_POSTS = 5;
const LANE_POSTS_PAGE = 5;

/** Sort keys for category lane rails — `value` is stored in state; label is shown in the dropdown. */
const LANE_SORT_OPTIONS: RailSectionSubheaderSortProps['options'] = [
  { value: 'feed', label: 'Feed order' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
];

const laneSwiperNavBtn = cn(
  '!size-10 !min-h-10 !min-w-10 !p-0 !bg-white !text-primary !border-border',
  'hover:!bg-white hover:!text-primary hover:!opacity-90 active:translate-x-0 active:translate-y-0 active:shadow-none'
);

type LaneSortValue = (typeof LANE_SORT_OPTIONS)[number]['value'];

function sortLanePosts(list: Post[], sort: LaneSortValue): Post[] {
  switch (sort) {
    case 'title-asc':
      return [...list].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      );
    case 'title-desc':
      return [...list].sort((a, b) =>
        b.title.localeCompare(a.title, undefined, { sensitivity: 'base' })
      );
    case 'newest':
      return [...list].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    case 'oldest':
      return [...list].sort(
        (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      );
    case 'feed':
    default:
      return list;
  }
}

function TrendingLaneBlogLoader() {
  return (
    <div
      className="flex h-full min-h-[18rem] w-full animate-pulse flex-col border-2 border-border bg-card p-4"
      aria-busy="true"
      aria-label="Loading more stories"
    >
      <div className="mb-3 h-36 w-full bg-muted/60" />
      <div className="mb-2 h-4 w-3/4 bg-muted/50" />
      <div className="h-3 w-1/2 bg-muted/40" />
    </div>
  );
}

function TrendingCategoryLane({
  category,
  token,
}: Readonly<{
  category: BlogTaxonomyRow;
  token: string | null;
}>) {
  const swiperRef = useRef<CompactBlogPostsSwiperHandle>(null);
  const postsRequestIdRef = useRef(0);
  const postsOffsetRef = useRef(0);
  const postsLoadingMoreRef = useRef(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsError, setPostsError] = useState<unknown | null>(null);
  const [laneQuery, setLaneQuery] = useState('');
  const [sortValue, setSortValue] = useState<LaneSortValue>('feed');

  const loadPosts = useCallback(
    async (reset: boolean) => {
      const requestId = ++postsRequestIdRef.current;
      const offset = reset ? 0 : postsOffsetRef.current;
      const limit = reset ? LANE_INITIAL_POSTS : LANE_POSTS_PAGE;

      if (reset) {
        setPostsLoading(true);
        setPostsError(null);
      } else {
        postsLoadingMoreRef.current = true;
        setPostsLoadingMore(true);
      }

      try {
        const { posts: raw, hasMore } = await blogApi.getPublishedFeed(
          limit,
          { category: category.slug, offset },
          token
        );
        if (requestId !== postsRequestIdRef.current) return;

        const mapped = raw.map(mapPublicFeedPostToPost);
        postsOffsetRef.current = offset + mapped.length;
        setPosts((prev) => (reset ? mapped : [...prev, ...mapped]));
        setPostsHasMore(hasMore);
        setPostsError(null);
      } catch (e) {
        if (requestId !== postsRequestIdRef.current) return;
        setPostsError(e);
        if (reset) {
          postsOffsetRef.current = 0;
          setPosts([]);
          setPostsHasMore(false);
        }
      } finally {
        if (requestId === postsRequestIdRef.current) {
          setPostsLoading(false);
          setPostsLoadingMore(false);
          postsLoadingMoreRef.current = false;
        }
      }
    },
    [category.slug, token]
  );

  useEffect(() => {
    postsOffsetRef.current = 0;
    void loadPosts(true);
  }, [loadPosts]);

  const handleLoadMorePosts = useCallback(() => {
    if (postsLoading || postsLoadingMore || !postsHasMore || postsLoadingMoreRef.current) return;
    void loadPosts(false);
  }, [loadPosts, postsHasMore, postsLoading, postsLoadingMore]);

  const filteredPosts = useMemo(() => {
    let list = posts;
    const q = laneQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.author.name && p.author.name.toLowerCase().includes(q))
      );
    }
    return sortLanePosts(list, sortValue);
  }, [posts, laneQuery, sortValue]);

  const laneHeaderCount = useMemo(() => {
    if (postsLoading) return <RailCountPillLoading />;
    const q = laneQuery.trim();
    if (q || filteredPosts.length !== posts.length) {
      return (
        <RailCountPillPair
          primary={filteredPosts.length}
          secondary={posts.length}
          primaryLabel={`${filteredPosts.length} matching`}
          secondaryLabel={`${posts.length} loaded`}
        />
      );
    }
    return (
      <RailCountPill
        count={category.postCount}
        aria-label={`${category.postCount.toLocaleString()} posts`}
      />
    );
  }, [
    category.postCount,
    filteredPosts.length,
    laneQuery,
    posts.length,
    postsLoading,
  ]);

  const showLaneArrows =
    filteredPosts.length > 1 && postsError == null && !postsLoading;

  return (
    <div className="min-w-0 space-y-3">
      <RailSectionSubheader
        label={category.name}
        text={laneHeaderCount}
        search={{
          value: laneQuery,
          onChange: setLaneQuery,
          placeholder: 'Search lane…',
          ariaLabel: `Search posts in ${category.name}`,
        }}
        sort={{
          id: `trending-lane-sort-${category.slug}`,
          value: sortValue,
          onChange: (v) => setSortValue(v as LaneSortValue),
          options: LANE_SORT_OPTIONS,
          placeholder: 'Sort',
        }}
        swiperButtons={
          showLaneArrows ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Scroll ${category.name} stories left`}
                onClick={() => swiperRef.current?.scrollPrev()}
                className={laneSwiperNavBtn}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Scroll ${category.name} stories right`}
                onClick={() => swiperRef.current?.scrollNext()}
                className={laneSwiperNavBtn}
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </>
          ) : null
        }
        buttons={[
          {
            label: 'View lane',
            href: `/topics/category/${encodeURIComponent(category.slug)}`,
            variant: 'primary',
          },
        ]}
      />

      <CompactBlogPostsSwiper
        ref={swiperRef}
        mode="rail"
        posts={filteredPosts}
        loading={postsLoading}
        error={postsError}
        onRetry={() => void loadPosts(true)}
        aria-label={`Posts in ${category.name}`}
        emptyHeadline="No posts in this lane yet"
        emptySub="Publish a story under this category to fill the row."
        showToolbarArrows={false}
        showPagination={false}
        snapSlides={false}
        onNearEnd={handleLoadMorePosts}
        nearEndDisabled={postsLoading || postsLoadingMore || !postsHasMore || laneQuery.trim() !== ''}
        endContent={postsLoadingMore ? <TrendingLaneBlogLoader /> : null}
      />
    </div>
  );
}

export function TrendingPage() {
  const token = useAuthStore((s) => s.token);
  const [heroPosts, setHeroPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<BlogTaxonomyRow[]>([]);
  const [categoriesHasMore, setCategoriesHasMore] = useState(false);
  const [heroLoading, setHeroLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesLoadingMore, setCategoriesLoadingMore] = useState(false);
  const [heroError, setHeroError] = useState<unknown | null>(null);
  const categoriesOffsetRef = useRef(0);
  const categoriesRequestIdRef = useRef(0);
  const categoriesLoadingMoreRef = useRef(false);
  const categoriesSentinelRef = useRef<HTMLDivElement>(null);

  const loadHero = useCallback(async () => {
    setHeroLoading(true);
    setHeroError(null);
    try {
      const globalFeed = await blogApi.getPublishedFeed(GLOBAL_HERO_LIMIT, undefined, token);
      setHeroPosts(globalFeed.posts.map(mapPublicFeedPostToPost));
    } catch (e) {
      setHeroError(e);
      setHeroPosts([]);
    } finally {
      setHeroLoading(false);
    }
  }, [token]);

  const loadCategoriesPage = useCallback(async (reset: boolean) => {
    const requestId = ++categoriesRequestIdRef.current;
    const offset = reset ? 0 : categoriesOffsetRef.current;

    if (reset) {
      setCategoriesLoading(true);
    } else {
      categoriesLoadingMoreRef.current = true;
      setCategoriesLoadingMore(true);
    }

    try {
      const page = await fetchCategoriesList({
        offset,
        limit: CATEGORY_PAGE_SIZE,
        sort: 'posts-desc',
      });
      if (requestId !== categoriesRequestIdRef.current) return;

      const rows = page.list
        .filter((c) => c.postCount > 0)
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          postCount: c.postCount,
          description: c.description,
        }));

      categoriesOffsetRef.current = offset + page.list.length;
      setCategories((prev) => (reset ? rows : [...prev, ...rows]));
      setCategoriesHasMore(page.hasMore);
    } catch {
      if (requestId !== categoriesRequestIdRef.current) return;
      if (reset) {
        categoriesOffsetRef.current = 0;
        setCategories([]);
        setCategoriesHasMore(false);
      }
    } finally {
      if (requestId === categoriesRequestIdRef.current) {
        setCategoriesLoading(false);
        setCategoriesLoadingMore(false);
        categoriesLoadingMoreRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    void loadHero();
    void loadCategoriesPage(true);
  }, [loadHero, loadCategoriesPage]);

  useEffect(() => {
    const el = categoriesSentinelRef.current;
    if (!el || categoriesLoading || categoriesLoadingMore || !categoriesHasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((entry) => entry.isIntersecting);
        if (!hit || categoriesLoadingMoreRef.current) return;
        void loadCategoriesPage(false);
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [categoriesLoading, categoriesLoadingMore, categoriesHasMore, loadCategoriesPage]);

  return (
    <div
      className={cn(
        SHELL_CONTENT_RAIL_CLASS,
        'flex min-h-0 flex-1 flex-col gap-10 pb-10 md:gap-12 md:pb-14'
      )}
    >
      <ShellPageIntroHeader
        breadcrumbItems={[{ href: '/', label: 'Home' }, { label: 'Trending' }]}
        description="A spotlight lane for what is moving right now, then top stories filed under each taxonomy category."
        title={
          <h1 className="flex flex-wrap items-center text-2xl font-black uppercase italic tracking-tighter text-foreground sm:text-3xl lg:text-4xl">
            <FireLottie autoplay size={40} />
            Trending
          </h1>
        }
        className="!space-y-3 md:!space-y-4"
      />

      <div className="-mt-2 min-w-0 md:-mt-3">
        <TrendingStackedHero
          posts={heroPosts}
          loading={heroLoading}
          error={heroError}
          onRetry={() => void loadHero()}
        />
      </div>

      <section className="min-w-0 space-y-10" aria-label="Trending by category">
        {categoriesLoading ? (
          <TrendingCategoryLaneSkeleton />
        ) : categories.length === 0 ? (
          <RailFeedEmptyState
            icon={Sparkles}
            title="Great things coming soon"
            description="Category lanes light up as stories trend across topics. The feed is warming up — check back shortly."
            className="py-14 sm:py-16"
            actions={[
              {
                label: 'Browse topics',
                href: '/topics',
                variant: 'primary',
                icon: <Compass className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />,
              },
              {
                label: 'Explore',
                href: '/explore',
                variant: 'default',
              },
            ]}
          />
        ) : (
          <>
            {categories.map((category) => (
              <TrendingCategoryLane key={category.slug} category={category} token={token} />
            ))}
            {categoriesLoadingMore ? <TrendingCategoryLaneSkeleton /> : null}
            <div ref={categoriesSentinelRef} className="h-px w-full" aria-hidden />
          </>
        )}
      </section>
    </div>
  );
}
