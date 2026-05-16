'use client';

import Link from 'next/link';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bookmark,
  Compass,
  FileStack,
  FolderOpen,
  Repeat2,
} from 'lucide-react';
import { blogApi } from '@/api/blog';
import { BlogCard } from '@/features/blog';
import { FollowingPostsGridSkeleton, HomeHeroSkeleton, HomePageSkeletonInner } from '@/components/skeletons';
import { useAuthStore } from '@/store/auth';
import { BLOG_FEED_GRID_CLASS, BLOG_FEED_GRID_ITEM_CLASS } from '@/lib/blog/blogFeedGrid';
import { RailFeedEmptyState, RailFeedErrorState } from '@/components/layout';
import { applyCustomFeedRules } from '@/lib/feeds/applyCustomFeedRules';
import { mapPublicFeedPostToPost } from '@/lib/blog/mapFeedPostToPost';
import { PrimaryCoverFallback } from '@/lib/shell/primaryCoverFallback';
import { cn } from '@/lib/core/utils';
import type { Post } from '@/types';
import type { BlogTaxonomyRow } from '@/types/blog';
import { defaultRules, useCustomFeedsStore, type CustomFeedRow } from '@/store/customFeeds';


const CATALOG_LIMIT = 50;
const HERO_FETCH_LIMIT = 12;
const HERO_AUTO_MS = 8000;

const DASHBOARD_CONTENT_OUTER = 'relative mx-auto w-full min-w-0 max-w-[min(100%,87.5rem)] shrink-0';
const DASHBOARD_CONTENT_PAD = 'px-4 md:px-8';

// --- Retro UI helpers ---

function formatHeroStatCount(n: number): string {
  if (n > 99) return '99+';
  return String(Math.max(0, n));
}

const HERO_STAT_ITEM_CLASS =
  'inline-flex items-center gap-1 font-mono text-[11px] font-black tabular-nums text-white/95 sm:text-xs';

/** Read-only engagement counts on the home hero (not interactive). */
function HeroEngagementStats({ post }: Readonly<{ post: Post }>) {
  const respect = post.respectCount ?? 0;
  const reposts = post.repostCount ?? 0;
  const bookmarks = post.bookmarkCount ?? 0;

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1"
      aria-label={`${respect} respects, ${reposts} reposts, ${bookmarks} bookmarks`}
    >
      <span className={HERO_STAT_ITEM_CLASS}>
        <img src="/svg/icons8-lightning-bolt.svg" alt="" className="size-3.5 shrink-0 object-contain opacity-95" />
        {formatHeroStatCount(respect)}
      </span>
      <span className="text-white/35" aria-hidden>
        ·
      </span>
      <span className={HERO_STAT_ITEM_CLASS}>
        <Repeat2 className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
        {formatHeroStatCount(reposts)}
      </span>
      <span className="text-white/35" aria-hidden>
        ·
      </span>
      <span className={HERO_STAT_ITEM_CLASS}>
        <Bookmark className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
        {formatHeroStatCount(bookmarks)}
      </span>
    </div>
  );
}

function MonthlyBadge({ date }: { date: string }) {
  const month = new Date(date).toLocaleString('default', { month: 'short' }).toUpperCase();
  const year = new Date(date).getFullYear();
  return (
    <div className="absolute right-4 top-4 z-30 rotate-12 scale-90 md:scale-100">
      <div className="relative flex flex-col items-center justify-center border-2 border-black bg-yellow-400 px-3 py-1 font-mono">
        <span className="text-[10px] font-black leading-none text-black/60">EDITION</span>
        <span className="text-sm font-black leading-none text-black">{month} {year}</span>
        <div className="absolute -left-1 -top-1 size-2-full border border-black bg-zinc-300" />
      </div>
    </div>
  );
}

function RailPill({
  active,
  onClick,
  children,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 border-2 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow'
          : 'border-border bg-card text-foreground hover:bg-muted/50',
      )}
    >
      <span
        className={cn(
          'size-2 shrink-0  border-2',
          active ? 'border-primary-foreground bg-primary-foreground' : 'border-border bg-muted-foreground/35',
        )}
        aria-hidden
      />
      {children}
    </button>
  );
}

// --- Main Component ---

function HomePageContent() {
  const customFeeds = useCustomFeedsStore((s) => s.feeds);
  const reduceMotion = useReducedMotion();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const [taxonomy, setTaxonomy] = useState<BlogTaxonomyRow[]>([]);
  const [selection, setSelection] = useState<RailSelection>({ kind: 'all' });
  const [catalog, setCatalog] = useState<Post[]>([]);
  const [categoryFetch, setCategoryFetch] = useState<Post[]>([]);
  const [gridLoading, setGridLoading] = useState(true);
  const [gridError, setGridError] = useState<unknown>(null);

  const [heroPosts, setHeroPosts] = useState<Post[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  const loadTaxonomy = useCallback(async () => {
    try {
      const tax = await blogApi.getTaxonomy();
      setTaxonomy(tax.categories ?? []);
    } catch { setTaxonomy([]); }
  }, []);

  useEffect(() => { void loadTaxonomy(); }, [loadTaxonomy]);

  const loadHero = useCallback(async () => {
    setHeroLoading(true);
    try {
      const { posts: raw } = await blogApi.getPublishedFeed(
        HERO_FETCH_LIMIT,
        { sort: 'views' },
        token,
      );
      setHeroPosts(raw.map(mapPublicFeedPostToPost));
      setHeroIndex(0);
    } catch {
      setHeroPosts([]);
    } finally {
      setHeroLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isHydrated) return;
    void loadHero();
  }, [loadHero, isHydrated]);

  const loadGrid = useCallback(async () => {
    setGridLoading(true);
    setGridError(null);
    try {
      if (selection.kind === 'category') {
        const { posts } = await blogApi.getPublishedFeed(
          CATALOG_LIMIT,
          { category: selection.slug },
          token,
        );
        setCategoryFetch(posts.map(mapPublicFeedPostToPost));
        setCatalog([]);
      } else {
        const { posts } = await blogApi.getPublishedFeed(CATALOG_LIMIT, undefined, token);
        setCatalog(posts.map(mapPublicFeedPostToPost));
        setCategoryFetch([]);
      }
    } catch (e) { setGridError(e); setCatalog([]); setCategoryFetch([]); } finally { setGridLoading(false); }
  }, [selection, token]);

  useEffect(() => {
    if (!isHydrated) return;
    void loadGrid();
  }, [loadGrid, isHydrated]);

  const heroN = heroPosts.length;
  const heroActive = heroN > 0 ? heroPosts[Math.min(heroIndex, heroN - 1)]! : null;

  useEffect(() => {
    if (reduceMotion || heroN < 2 || heroPaused || heroLoading) return;
    const t = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroN);
    }, HERO_AUTO_MS);
    return () => window.clearInterval(t);
  }, [reduceMotion, heroN, heroPaused, heroLoading]);

  const heroGo = useCallback((next: number) => {
    const len = heroPosts.length;
    if (len < 1) return;
    setHeroIndex(((next % len) + len) % len);
  }, [heroPosts.length]);

  const heroVariants = useMemo(
    () =>
      reduceMotion
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
          }
        : {
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
          },
    [reduceMotion],
  );

  const heroTransition = useMemo(
    () =>
      reduceMotion
        ? { duration: 0.12 }
        : { duration: 0.2, ease: [0.33, 1, 0.68, 1] as const },
    [reduceMotion],
  );

  const gridPosts = useMemo(() => {
    if (selection.kind === 'category') return categoryFetch;
    if (selection.kind === 'custom') return applyCustomFeedRules(catalog, selection.feed.rules);
    if (selection.kind === 'categorized') {
      return catalog.filter((p) => norm(p.category ?? '') !== '');
    }
    return applyCustomFeedRules(catalog, defaultRules());
  }, [catalog, categoryFetch, selection]);

  const noCatalogSource =
    selection.kind === 'category' ? categoryFetch.length === 0 : catalog.length === 0;

  const categoriesSorted = useMemo(
    () => [...taxonomy].sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name)),
    [taxonomy],
  );

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden bg-[hsl(var(--background))]">
      <div className={cn(DASHBOARD_CONTENT_OUTER, 'pt-8 md:pt-10')}>
        <div className={cn(DASHBOARD_CONTENT_PAD)}>
          
          {/* HERO SWIPER SECTION */}
          <section
            className="group relative flex flex-col overflow-hidden border-2 border-border bg-card dark:border-muted"
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
          >
            {heroLoading ? (
              <HomeHeroSkeleton inline />
            ) : heroActive ? (
              <>
                <div className="relative h-[480px] md:h-[560px] overflow-hidden bg-black">
                  {heroN > 1 ? (
                    <div
                      className="absolute left-4 top-4 z-50 flex flex-wrap gap-1.5"
                      role="tablist"
                      aria-label="Hero stories"
                    >
                      {heroPosts.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          role="tab"
                          aria-selected={i === heroIndex}
                          aria-label={`Story ${i + 1} of ${heroN}`}
                          onClick={() => heroGo(i)}
                          className={cn(
                            'size-3 border-2 transition-colors duration-150',
                            i === heroIndex
                              ? 'border-primary bg-primary'
                              : 'border-border/80 bg-muted/40 hover:bg-muted',
                          )}
                        />
                      ))}
                    </div>
                  ) : null}

                  <Link
                    href={heroPostHref(heroActive)}
                    aria-label={`Read article: ${heroActive.title}`}
                    className="absolute inset-0 z-30 cursor-pointer outline-none ring-inset focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="sr-only">Open full article</span>
                  </Link>

                  {/* CRT Scanline Overlay */}
                  <div className="pointer-events-none absolute inset-0 z-20 opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,4px_100%]" />

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={heroActive.id}
                      variants={heroVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={heroTransition}
                      className="pointer-events-none absolute inset-0"
                    >
                      {heroActive.coverImage ? (
                        <img src={heroActive.coverImage} className="size-full object-cover opacity-60 saturate-[1.2]" alt="" />
                      ) : (
                        <PrimaryCoverFallback variant="blog" showLabel={false} dimmed />
                      )}

                      <MonthlyBadge date={heroActive.publishedAt} />

                      {/* Content Overlay */}
                      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                        
                        <div className="relative z-10 max-w-3xl">
                          <motion.div
                            initial={{ x: -12, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: [0.33, 1, 0.68, 1] }}
                            className="mb-4 inline-flex border-2 border-primary bg-primary px-3 py-1 font-mono text-[10px] font-black uppercase text-primary-foreground"
                          >
                            {heroActive.category || 'FEATURED_ENTRY'}
                          </motion.div>

                          <h2 className="mb-4 line-clamp-3 max-w-3xl break-words font-mono text-3xl font-black uppercase leading-[1.05] tracking-tighter text-white md:text-5xl lg:text-6xl">
                            {heroActive.title}
                          </h2>

                          <div className="mb-8 max-w-xl">
                            <p className="mb-1.5 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                              Summary
                            </p>
                            <p className="line-clamp-2 text-pretty font-mono text-sm leading-relaxed text-zinc-300 md:text-base">
                              {heroExcerptPlain(heroActive, 280)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 border-t border-white/15 pt-5 md:gap-6 md:pt-6">
                            <div className="flex items-center gap-2">
                               <div className="size-10 border-2 border-white/30 bg-zinc-800">
                                 {heroActive.author.image && (
                                 <img src={heroActive.author.image} alt="" className="size-full object-cover" />
                               )}
                               </div>
                               <div className="font-mono text-[10px] leading-tight text-white">
                                 <p className="font-black uppercase">{heroActive.author.name}</p>
                                 <p className="text-zinc-500">@{heroActive.author.username}</p>
                               </div>
                            </div>

                            <HeroEngagementStats post={heroActive} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="py-20 text-center font-mono">NO_DATA_FOUND</div>
            )}
          </section>

        </div>
      </div>

      {/* LIBRARY SECTION */}
      <div className={cn(DASHBOARD_CONTENT_OUTER, 'py-10 md:py-12')}>
        <section className={cn('min-w-0 max-w-full space-y-4 overflow-x-hidden', DASHBOARD_CONTENT_PAD)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-mono text-lg font-black uppercase tracking-tight text-foreground">
              <FolderOpen className="size-5 text-primary" strokeWidth={2.5} aria-hidden />
              Library
            </h2>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
            <RailPill active={selection.kind === 'all'} onClick={() => setSelection({ kind: 'all' })}>
              All blogs
            </RailPill>
            <RailPill
              active={selection.kind === 'categorized'}
              onClick={() => setSelection({ kind: 'categorized' })}
            >
              All categories
            </RailPill>
            {categoriesSorted.map((c) => (
              <RailPill
                key={c.slug}
                active={selection.kind === 'category' && selection.slug === c.slug}
                onClick={() => setSelection({ kind: 'category', slug: c.slug, name: c.name })}
              >
                <span className="max-w-[9rem] truncate">{c.name}</span>
              </RailPill>
            ))}
            {customFeeds.map((f) => (
              <RailPill
                key={f.id}
                active={selection.kind === 'custom' && selection.feed.id === f.id}
                onClick={() => setSelection({ kind: 'custom', feed: f })}
              >
                {f.iconEmoji ? (
                  <span className="text-sm leading-none normal-case" aria-hidden>
                    {f.iconEmoji}
                  </span>
                ) : null}
                <span className="max-w-[8rem] truncate normal-case tracking-normal">{f.name}</span>
              </RailPill>
            ))}
          </div>

          {gridError != null ? (
            <RailFeedErrorState
              title="Could not load posts"
              error={gridError}
              onRetry={() => void loadGrid()}
            />
          ) : gridLoading ? (
            <FollowingPostsGridSkeleton count={6} />
          ) : gridPosts.length === 0 ? (
            noCatalogSource ? (
              <RailFeedEmptyState
                icon={FileStack}
                title="No published posts yet"
                description="When someone publishes a story, it will show up here."
                actions={[
                  {
                    label: 'Browse topics',
                    href: '/topics',
                    variant: 'primary',
                    icon: <Compass className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />,
                  },
                ]}
              />
            ) : (
              <RailFeedEmptyState
                icon={FileStack}
                variant="filter"
                title="No posts match this view"
                description={
                  selection.kind === 'custom'
                    ? 'Adjust this feed’s rules in the sidebar, or pick another pill above.'
                    : 'Try another category or switch to All blogs.'
                }
                actions={[
                  {
                    label: 'All blogs',
                    onClick: () => setSelection({ kind: 'all' }),
                    variant: 'primary',
                  },
                ]}
              />
            )
          ) : (
            <ul className={BLOG_FEED_GRID_CLASS}>
              {gridPosts.map((post) => (
                <li key={post.id} className={BLOG_FEED_GRID_ITEM_CLASS}>
                  <BlogCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// --- Shared Helpers ---
function norm(s: string): string {
  return s.trim().toLowerCase();
}

function heroPostHref(post: Post): string {
  const raw = post.author.username?.trim() || post.author.id?.trim() || '';
  const u = raw || 'unknown';
  return `/blogs/${encodeURIComponent(u)}/${encodeURIComponent(post.slug)}`;
}

function heroExcerptPlain(post: Post, max = 180): string {
  const raw = (post.excerpt ?? '').replace(/\s+/g, ' ').trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1)}…`;
}
type RailSelection =
  | { kind: 'all' }
  | { kind: 'categorized' }
  | { kind: 'category'; slug: string; name: string }
  | { kind: 'custom'; feed: CustomFeedRow };

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageSkeletonInner />}>
      <HomePageContent />
    </Suspense>
  );
}
