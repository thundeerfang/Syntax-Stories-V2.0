'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { blogApi } from '@/api/blog';
import {
  CompactBlogPostsSwiper,
  type CompactBlogPostsSwiperHandle,
} from '@/components/blog/CompactBlogPostsSwiper';
import {
  RailSectionSubheader,
  type RailSectionSubheaderSortProps,
} from '@/components/layout/RailSectionSubheader';
import { ShellPageIntroHeader } from '@/components/layout/ShellPageIntroHeader';
import { TrendingStackedHero } from '@/components/trending/TrendingStackedHero';
import { mapPublicFeedPostToPost } from '@/lib/mapFeedPostToPost';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';
import { cn } from '@/lib/utils';
import type { BlogTaxonomyRow } from '@/types/blog';
import type { Post } from '@/types';

const GLOBAL_HERO_LIMIT = 14;
const CATEGORY_SECTIONS = 6;
const PER_CATEGORY_LIMIT = 10;

/** Sort keys for category lane rails — `value` is stored in state; label is shown in the dropdown. */
const LANE_SORT_OPTIONS: RailSectionSubheaderSortProps['options'] = [
  { value: 'feed', label: 'Feed order' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
];

type LaneSortValue = (typeof LANE_SORT_OPTIONS)[number]['value'];

function sortLanePosts(list: Post[], sort: LaneSortValue): Post[] {
  switch (sort) {
    case 'title-asc':
      return [...list].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    case 'title-desc':
      return [...list].sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: 'base' }));
    case 'newest':
      return [...list].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    case 'oldest':
      return [...list].sort(
        (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
      );
    case 'feed':
    default:
      return list;
  }
}

function TrendingCategoryLane({
  category,
  posts,
  error,
  onRetry,
}: Readonly<{
  category: BlogTaxonomyRow;
  posts: Post[];
  error: unknown | null;
  onRetry: () => void;
}>) {
  const swiperRef = useRef<CompactBlogPostsSwiperHandle>(null);
  const [laneQuery, setLaneQuery] = useState('');
  const [sortValue, setSortValue] = useState<LaneSortValue>('feed');

  const filteredPosts = useMemo(() => {
    let list = posts;
    const q = laneQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.author.name && p.author.name.toLowerCase().includes(q)),
      );
    }
    return sortLanePosts(list, sortValue);
  }, [posts, laneQuery, sortValue]);

  const laneToolbarBtn =
    'inline-flex h-[42px] shrink-0 items-center justify-center border-2 border-border bg-background font-mono text-[10px] font-black uppercase tracking-widest text-foreground transition-colors hover:bg-muted/50';

  return (
    <div className="min-w-0 space-y-3">
      <RailSectionSubheader
        label={category.name}
        text={
          <span className="text-muted-foreground">
            {filteredPosts.length === posts.length
              ? `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`
              : `${filteredPosts.length} of ${posts.length} posts`}
          </span>
        }
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
          filteredPosts.length > 1 && error == null ? (
            <>
              <button
                type="button"
                aria-label={`Scroll ${category.name} stories left`}
                onClick={() => swiperRef.current?.scrollPrev()}
                className={cn(laneToolbarBtn, 'w-10 p-0')}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Scroll ${category.name} stories right`}
                onClick={() => swiperRef.current?.scrollNext()}
                className={cn(laneToolbarBtn, 'w-10 p-0')}
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
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
        loading={false}
        error={error}
        onRetry={onRetry}
        aria-label={`Posts in ${category.name}`}
        emptyHeadline="No posts in this lane yet"
        emptySub="Publish a story under this category to fill the row."
        showToolbarArrows={false}
        showPagination={false}
        snapSlides={false}
      />
    </div>
  );
}

export function TrendingPageContent() {
  const [heroPosts, setHeroPosts] = useState<Post[]>([]);
  const [categoryRows, setCategoryRows] = useState<
    { category: BlogTaxonomyRow; posts: Post[]; error: unknown | null }[]
  >([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [heroError, setHeroError] = useState<unknown | null>(null);

  const load = useCallback(async () => {
    setHeroLoading(true);
    setCategoriesLoading(true);
    setHeroError(null);
    try {
      const [tax, globalFeed] = await Promise.all([
        blogApi.getTaxonomy(),
        blogApi.getPublishedFeed(GLOBAL_HERO_LIMIT),
      ]);
      setHeroPosts(globalFeed.posts.map(mapPublicFeedPostToPost));
      setHeroLoading(false);

      const categories = [...(tax.categories ?? [])]
        .filter((c) => c.postCount > 0)
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, CATEGORY_SECTIONS);

      const rows = await Promise.all(
        categories.map(async (row) => {
          try {
            const { posts } = await blogApi.getPublishedFeed(PER_CATEGORY_LIMIT, {
              category: row.slug,
            });
            return { category: row, posts: posts.map(mapPublicFeedPostToPost), error: null as unknown | null };
          } catch (e) {
            return { category: row, posts: [] as Post[], error: e };
          }
        }),
      );
      setCategoryRows(rows);
    } catch (e) {
      setHeroError(e);
      setHeroPosts([]);
      setCategoryRows([]);
      setHeroLoading(false);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sectionsToShow = useMemo(
    () => categoryRows.filter((r) => r.posts.length > 0 || r.error != null),
    [categoryRows],
  );

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col gap-10 pb-10 md:gap-12 md:pb-14')}>
      <ShellPageIntroHeader
        breadcrumbItems={[{ href: '/', label: 'Home' }, { label: 'Trending' }]}
        description="A spotlight lane for what is moving right now, then top stories filed under each taxonomy category."
        title={
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black uppercase italic tracking-tighter text-foreground sm:text-3xl lg:text-4xl">
            <Flame className="size-7 shrink-0 text-primary sm:size-8" strokeWidth={2.5} aria-hidden />
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
          onRetry={() => void load()}
        />
      </div>

      <section className="min-w-0 space-y-10" aria-label="Trending by category">
        {categoriesLoading ? (
          <div className="space-y-10">
            {[0, 1, 2].map((k) => (
              <div key={k} className="space-y-3">
                <div className="h-6 w-48 animate-pulse bg-muted/50" />
                <div className="min-h-[200px] border-2 border-border bg-muted/20">
                  <div className="h-40 animate-pulse bg-muted-foreground/10" />
                </div>
              </div>
            ))}
          </div>
        ) : sectionsToShow.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No category lanes with posts yet. Open{' '}
            <Link href="/topics" className="font-semibold text-primary underline underline-offset-2">
              Topics
            </Link>{' '}
            to explore taxonomy.
          </p>
        ) : (
          sectionsToShow.map(({ category, posts, error }) => (
            <TrendingCategoryLane
              key={category.slug}
              category={category}
              posts={posts}
              error={error}
              onRetry={() => void load()}
            />
          ))
        )}
      </section>
    </div>
  );
}
