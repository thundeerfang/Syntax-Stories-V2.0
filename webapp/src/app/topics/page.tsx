'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Hash, Layers, Tags } from 'lucide-react';
import { RetroSortDropdown } from '@/components/ui/retro';
import { toast } from 'sonner';
import {
  fetchCategoriesList,
  fetchTagsExplore,
  fetchTagsList,
  type TagExploreRow,
} from '@/api/tagsExplore';
import { RailFeedEmptyState, ShellPageIntroHeader } from '@/components/layout';
import { FeaturedCategoryCard } from '@/features/explore';
import { RankCountPill } from '@/features/topics';
import { SearchField } from '@/components/ui/form';
import { HashtagBadgeLink } from '@/features/tags';
import { BlogApiConnectionError } from '@/lib/api/blogAuthFetch';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';
import type { BlogTaxonomyRow } from '@/types/blog';
import type { TagListSort } from '@contracts/tagsExploreApi';

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((m) => m.DotLottieReact),
  { ssr: false }
);

function toastApiError(e: unknown, fallback: string) {
  if (e instanceof BlogApiConnectionError) {
    toast.error(e.message);
    return;
  }
  toast.error(e instanceof Error && e.message ? e.message : fallback);
}

function HeaderDotLottie({ src, size }: Readonly<{ src: string; size: number }>) {
  return (
    <span
      className="pointer-events-none inline-flex shrink-0 overflow-hidden"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <DotLottieReact
        src={src}
        loop
        autoplay
        style={{ width: size, height: size, display: 'block' }}
        renderConfig={{ autoResize: true }}
      />
    </span>
  );
}

const tagLinkHoverClass =
  'inline-flex max-w-full min-w-0 items-center  px-2.5 py-1 font-mono text-[12px] font-medium tracking-tight text-foreground transition-colors hover:bg-primary hover:text-primary-foreground';

const TAG_SORT_OPTIONS: ReadonlyArray<{ value: TagListSort; label: string; shortLabel: string }> =
  [
    { value: 'name-asc', label: 'Name A–Z', shortLabel: 'A–Z' },
    { value: 'name-desc', label: 'Name Z–A', shortLabel: 'Z–A' },
    { value: 'posts-desc', label: 'Most posts', shortLabel: 'Posts' },
    { value: 'recent', label: 'Recently used', shortLabel: 'Recent' },
  ];

const CATEGORY_PAGE_SIZE = 6;
const TAG_PAGE_SIZE = 48;

function TagListSkeleton({ count = 12 }: Readonly<{ count?: number }>) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-8 animate-pulse border-2 border-border bg-muted/40"
          style={{ width: `${72 + (i % 5) * 18}px` }}
        />
      ))}
    </div>
  );
}

function CategoryGridSkeleton({ count = CATEGORY_PAGE_SIZE }: Readonly<{ count?: number }>) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="min-h-[12rem] animate-pulse border-2 border-border bg-muted/40" />
      ))}
    </div>
  );
}

function TagRankCard({
  title,
  rows,
  headerStart,
}: Readonly<{
  title: string;
  rows: TagExploreRow[];
  headerStart: ReactNode;
}>) {
  const shown = rows.slice(0, 10);
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col border-2 border-border bg-card p-4">
      <div className="flex items-center gap-2.5 border-b border-muted-foreground/25 pb-3">
        <span className="flex shrink-0 items-center justify-center" aria-hidden>
          {headerStart}
        </span>
        <h2 className="min-w-0 flex-1 font-mono text-xs font-black uppercase tracking-widest text-foreground">
          {title}
        </h2>
      </div>
      <ol className="mt-4 flex list-none flex-col gap-2.5 p-0">
        {shown.map((row, i) => (
          <li key={row.slug} className="flex min-w-0 items-center gap-3 font-mono text-[13px]">
            <span className="w-6 shrink-0 tabular-nums text-[12px] font-semibold text-muted-foreground">
              {i + 1}
            </span>
            <Link
              href={`/topics/${encodeURIComponent(row.slug)}`}
              className={cn(tagLinkHoverClass, 'min-w-0 flex-1 text-[13px]')}
            >
              <span className="block truncate">{row.name}</span>
            </Link>
            <RankCountPill count={row.postCount} />
          </li>
        ))}
      </ol>
      {shown.length === 0 ? (
        <RailFeedEmptyState
          icon={Tags}
          density="compact"
          bordered={false}
          className="mt-4 flex-1"
          title="No tags yet"
          description="When writers publish with tags, they will rank here."
        />
      ) : null}
    </div>
  );
}

function CategoryRankCard({
  title,
  rows,
  headerStart,
}: Readonly<{
  title: string;
  rows: BlogTaxonomyRow[];
  headerStart: ReactNode;
}>) {
  const shown = rows.slice(0, 10);
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col border-2 border-border bg-card p-4">
      <div className="flex items-center gap-2.5 border-b border-muted-foreground/25 pb-3">
        <span className="flex shrink-0 items-center justify-center" aria-hidden>
          {headerStart}
        </span>
        <h2 className="min-w-0 flex-1 font-mono text-xs font-black uppercase tracking-widest text-foreground">
          {title}
        </h2>
      </div>
      <ol className="mt-4 flex list-none flex-col gap-2.5 p-0">
        {shown.map((row, i) => (
          <li key={row.slug} className="flex min-w-0 items-center gap-3 font-mono text-[13px]">
            <span className="w-6 shrink-0 tabular-nums text-[12px] font-semibold text-muted-foreground">
              {i + 1}
            </span>
            <Link
              href={`/topics/category/${encodeURIComponent(row.slug)}`}
              className={cn(tagLinkHoverClass, 'min-w-0 flex-1 text-[13px]')}
            >
              <span className="block truncate">{row.name}</span>
            </Link>
            <RankCountPill count={row.postCount} />
          </li>
        ))}
      </ol>
      {shown.length === 0 ? (
        <RailFeedEmptyState
          icon={Layers}
          density="compact"
          bordered={false}
          className="mt-4 flex-1"
          title="No categories yet"
          description="Taxonomy categories with published posts will appear here."
        />
      ) : null}
    </div>
  );
}

export default function TopicsPage() {
  const [trending, setTrending] = useState<TagExploreRow[]>([]);
  const [popular, setPopular] = useState<TagExploreRow[]>([]);
  const [popularCategories, setPopularCategories] = useState<BlogTaxonomyRow[]>([]);
  const [rankCardsLoading, setRankCardsLoading] = useState(true);

  const [categories, setCategories] = useState<BlogTaxonomyRow[]>([]);
  const [categoriesTotal, setCategoriesTotal] = useState(0);
  const [categoriesHasMore, setCategoriesHasMore] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesLoadingMore, setCategoriesLoadingMore] = useState(false);

  const [tags, setTags] = useState<TagExploreRow[]>([]);
  const [tagsTotal, setTagsTotal] = useState(0);
  const [tagsHasMore, setTagsHasMore] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsLoadingMore, setTagsLoadingMore] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [tagSort, setTagSort] = useState<TagListSort>('name-asc');

  const tagsSentinelRef = useRef<HTMLDivElement>(null);
  const tagsLoadingMoreRef = useRef(false);
  const tagsRequestIdRef = useRef(0);
  const categoriesRequestIdRef = useRef(0);
  const categoriesOffsetRef = useRef(0);
  const tagsOffsetRef = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchInput.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setRankCardsLoading(true);
    void (async () => {
      try {
        const [explore, popularCats] = await Promise.all([
          fetchTagsExplore(),
          fetchCategoriesList({ offset: 0, limit: 10, sort: 'posts-desc' }),
        ]);
        if (cancelled) return;
        setTrending(explore.trending);
        setPopular(explore.popular);
        setPopularCategories(
          popularCats.list.map((c) => ({
            slug: c.slug,
            name: c.name,
            postCount: c.postCount,
            description: c.description,
          }))
        );
      } catch (e) {
        if (!cancelled) {
          toastApiError(e, 'Could not load topic rankings');
          setTrending([]);
          setPopular([]);
          setPopularCategories([]);
        }
      } finally {
        if (!cancelled) setRankCardsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCategoriesPage = useCallback(async (reset: boolean) => {
    const requestId = ++categoriesRequestIdRef.current;
    const offset = reset ? 0 : categoriesOffsetRef.current;

    if (reset) {
      setCategoriesLoading(true);
    } else {
      setCategoriesLoadingMore(true);
    }

    try {
      const page = await fetchCategoriesList({
        offset,
        limit: CATEGORY_PAGE_SIZE,
        sort: 'name-asc',
      });
      if (categoriesRequestIdRef.current !== requestId) return;

      const rows = page.list.map((c) => ({
        slug: c.slug,
        name: c.name,
        postCount: c.postCount,
        description: c.description,
      }));

      categoriesOffsetRef.current = offset + rows.length;
      setCategories((prev) => (reset ? rows : [...prev, ...rows]));
      setCategoriesTotal(page.total);
      setCategoriesHasMore(page.hasMore);
    } catch (e) {
      if (categoriesRequestIdRef.current !== requestId) return;
      toastApiError(e, 'Could not load categories');
      if (reset) {
        categoriesOffsetRef.current = 0;
        setCategories([]);
        setCategoriesTotal(0);
        setCategoriesHasMore(false);
      }
    } finally {
      if (categoriesRequestIdRef.current === requestId) {
        setCategoriesLoading(false);
        setCategoriesLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadCategoriesPage(true);
  }, [loadCategoriesPage]);

  const loadTagsPage = useCallback(
    async (reset: boolean) => {
      const requestId = ++tagsRequestIdRef.current;
      const offset = reset ? 0 : tagsOffsetRef.current;

      if (reset) {
        setTagsLoading(true);
      } else {
        tagsLoadingMoreRef.current = true;
        setTagsLoadingMore(true);
      }

      try {
        const page = await fetchTagsList({
          offset,
          limit: TAG_PAGE_SIZE,
          sort: tagSort,
          q: searchDebounced || undefined,
        });
        if (tagsRequestIdRef.current !== requestId) return;

        tagsOffsetRef.current = offset + page.list.length;
        setTags((prev) => (reset ? page.list : [...prev, ...page.list]));
        setTagsTotal(page.total);
        setTagsHasMore(page.hasMore);
      } catch (e) {
        if (tagsRequestIdRef.current !== requestId) return;
        toastApiError(e, 'Could not load tags');
        if (reset) {
          tagsOffsetRef.current = 0;
          setTags([]);
          setTagsTotal(0);
          setTagsHasMore(false);
        }
      } finally {
        if (tagsRequestIdRef.current === requestId) {
          setTagsLoading(false);
          setTagsLoadingMore(false);
          tagsLoadingMoreRef.current = false;
        }
      }
    },
    [tagSort, searchDebounced]
  );

  useEffect(() => {
    void loadTagsPage(true);
  }, [loadTagsPage]);

  useEffect(() => {
    const el = tagsSentinelRef.current;
    if (!el || tagsLoading || tagsLoadingMore || !tagsHasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((entry) => entry.isIntersecting);
        if (!hit || tagsLoadingMoreRef.current) return;
        void loadTagsPage(false);
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [tagsLoading, tagsLoadingMore, tagsHasMore, loadTagsPage]);

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <ShellPageIntroHeader
          breadcrumbItems={[{ href: '/', label: 'Home' }, { label: 'Topics' }]}
          description="Browse taxonomy categories and tags writers use — open a category for its post stream, or a tag."
          title={
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
              Explore{' '}
              <span className="text-primary underline decoration-4 underline-offset-4 sm:decoration-6 sm:underline-offset-6">
                topics.
              </span>
            </h1>
          }
        />

        {rankCardsLoading ? (
          <div className="grid gap-4 md:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((k) => (
              <div key={k} className="h-72 animate-pulse border-2 border-border bg-muted/40" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <TagRankCard
              title="Trending tags"
              rows={trending}
              headerStart={<HeaderDotLottie src="/lottie/Fire.lottie" size={28} />}
            />
            <TagRankCard
              title="Popular tags"
              rows={popular}
              headerStart={<HeaderDotLottie src="/lottie/Tags.lottie" size={28} />}
            />
            <CategoryRankCard
              title="Popular categories"
              rows={popularCategories}
              headerStart={
                <Layers className="size-6 shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
              }
            />
          </div>
        )}

        <section aria-labelledby="all-categories-heading" className="min-w-0 space-y-3">
          <h2
            id="all-categories-heading"
            className="font-mono text-sm font-black uppercase tracking-wide text-foreground"
          >
            All categories
          </h2>
          <div>
            {categoriesLoading ? (
              <CategoryGridSkeleton />
            ) : categories.length === 0 ? (
              <RailFeedEmptyState
                icon={Layers}
                title="No categories in taxonomy yet"
                description="When staff publish taxonomy categories and writers file stories under them, they will show up here."
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((c) => (
                    <FeaturedCategoryCard
                      key={c.slug}
                      slug={c.slug}
                      name={c.name}
                      description={
                        c.description?.trim()
                          ? c.description.trim()
                          : `Writers filing stories under ${c.name}.`
                      }
                      postCount={c.postCount}
                    />
                  ))}
                </div>
                {categoriesLoadingMore ? (
                  <div className="mt-4">
                    <CategoryGridSkeleton />
                  </div>
                ) : null}
                {categoriesHasMore && !categoriesLoadingMore ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => void loadCategoriesPage(false)}
                      className="w-full border-2 border-border bg-card px-4 py-2.5 font-mono text-[10px] font-black uppercase tracking-widest text-foreground transition-colors hover:bg-muted/40"
                    >
                      View more ({categories.length}/{categoriesTotal})
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>

        <section aria-labelledby="all-tags-heading" className="min-w-0 space-y-3">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <h2
                id="all-tags-heading"
                className="shrink-0 font-mono text-sm font-black uppercase tracking-wide text-foreground"
              >
                All tags
              </h2>
              <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-stretch sm:justify-end sm:gap-2">
                <SearchField
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search tags…"
                />
                <RetroSortDropdown
                  value={tagSort}
                  onChange={setTagSort}
                  options={TAG_SORT_OPTIONS}
                  ariaLabelPrefix="Sort tags"
                  triggerClassName="sm:min-w-[8.25rem]"
                />
              </div>
            </div>
          </div>
          <div>
            {tagsLoading ? (
              <TagListSkeleton count={24} />
            ) : tagsTotal === 0 && !searchDebounced ? (
              <RailFeedEmptyState
                icon={Hash}
                title="No tags published yet"
                description="When someone publishes a story with tags, they will show up here."
              />
            ) : tags.length === 0 ? (
              <RailFeedEmptyState
                icon={Hash}
                variant="filter"
                title="No tags match your search"
                description="Try a different keyword or clear the search field."
                actions={[{ label: 'Clear search', onClick: () => setSearchInput('') }]}
              />
            ) : (
              <>
                <div className="flex flex-wrap gap-x-3 gap-y-2">
                  {tags.map((t) => (
                    <HashtagBadgeLink
                      key={t.slug}
                      slug={t.slug}
                      label={t.name}
                      postCount={t.postCount}
                    />
                  ))}
                </div>
                {tagsLoadingMore ? (
                  <div className="mt-3">
                    <TagListSkeleton count={16} />
                  </div>
                ) : null}
                {tagsHasMore ? (
                  <div ref={tagsSentinelRef} className="h-px w-full" aria-hidden />
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
