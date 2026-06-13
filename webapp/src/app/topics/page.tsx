'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Hash, Layers, Tags } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchCategoriesList,
  fetchTagsExplore,
  fetchTagsList,
  type TagExploreRow,
} from '@/api/tagsExplore';
import {
  RailCountPill,
  RailCountPillLoading,
  RailCountPillPair,
  RailFeedEmptyState,
  RailListPaginationFooter,
  RailSectionSubheader,
  ShellPageIntroHeader,
  type RailSectionSubheaderFilterProps,
  type RailSectionSubheaderSortProps,
} from '@/components/layout';
import { FeaturedCategoryCard } from '@/features/explore';
import { RankCountPill } from '@/features/topics';
import { HashtagBadgeLink } from '@/features/tags';
import { BlogApiConnectionError } from '@/lib/api/blogAuthFetch';
import {
  FOLLOWED_CATEGORIES_CHANGED_EVENT,
  readFollowedCategorySlugs,
} from '@/lib/feeds/followedCategoriesStorage';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';
import { useAuthStore } from '@/store/auth';
import type { BlogTaxonomyRow } from '@/types/blog';
import type { TagListSort, CategoryListSort } from '@contracts/tagsExploreApi';

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

const TAG_SORT_OPTIONS: RailSectionSubheaderSortProps['options'] = [
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'posts-desc', label: 'Most posts' },
  { value: 'recent', label: 'Recently used' },
];

const CATEGORY_SORT_OPTIONS: RailSectionSubheaderSortProps['options'] = [
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'posts-desc', label: 'Most posts' },
];

type CategoryListFilter = 'all' | 'followed';

const CATEGORY_FILTER_OPTIONS: RailSectionSubheaderFilterProps['options'] = [
  { value: 'all', label: 'All' },
  { value: 'followed', label: 'Followed' },
];

const CATEGORY_PAGE_SIZE = 6;
const TAG_PAGE_SIZE = 24;
const CATEGORY_FETCH_CHUNK = 50;

function mapCategoryRow(c: {
  slug: string;
  name: string;
  postCount: number;
  description: string;
}): BlogTaxonomyRow {
  return {
    slug: c.slug,
    name: c.name,
    postCount: c.postCount,
    description: c.description,
  };
}

type CategoriesCacheEntry = {
  total: number;
  pages: Map<number, BlogTaxonomyRow[]>;
  followedRows?: BlogTaxonomyRow[];
};

type TagsCacheEntry = {
  total: number;
  pages: Map<number, TagExploreRow[]>;
};

function categoriesQueryKey(
  filter: CategoryListFilter,
  sort: CategoryListSort,
  q: string
): string {
  return `${filter}|${sort}|${q}`;
}

function tagsQueryKey(sort: TagListSort, q: string): string {
  return `${sort}|${q}`;
}

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
  const userId = useAuthStore((s) => s.user?.id ?? s.user?._id ?? null);

  const [trending, setTrending] = useState<TagExploreRow[]>([]);
  const [popular, setPopular] = useState<TagExploreRow[]>([]);
  const [popularCategories, setPopularCategories] = useState<BlogTaxonomyRow[]>([]);
  const [rankCardsLoading, setRankCardsLoading] = useState(true);

  const [categories, setCategories] = useState<BlogTaxonomyRow[]>([]);
  const [categoriesTotal, setCategoriesTotal] = useState(0);
  const [categoriesBootstrapping, setCategoriesBootstrapping] = useState(true);
  const [categoriesPagePending, setCategoriesPagePending] = useState(false);
  const [categoryPage, setCategoryPage] = useState(0);

  const [tags, setTags] = useState<TagExploreRow[]>([]);
  const [tagsTotal, setTagsTotal] = useState(0);
  const [tagsBootstrapping, setTagsBootstrapping] = useState(true);
  const [tagsPagePending, setTagsPagePending] = useState(false);
  const [tagPage, setTagPage] = useState(0);

  const [categorySearchInput, setCategorySearchInput] = useState('');
  const [categorySearchDebounced, setCategorySearchDebounced] = useState('');
  const [categorySort, setCategorySort] = useState<CategoryListSort>('name-asc');
  const [categoryFilter, setCategoryFilter] = useState<CategoryListFilter>('all');

  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [tagSort, setTagSort] = useState<TagListSort>('name-asc');

  const categoriesRequestIdRef = useRef(0);
  const tagsRequestIdRef = useRef(0);
  const categoriesCacheRef = useRef<Map<string, CategoriesCacheEntry>>(new Map());
  const tagsCacheRef = useRef<Map<string, TagsCacheEntry>>(new Map());

  const applyCategoryPage = useCallback((entry: CategoriesCacheEntry, page: number) => {
    if (entry.followedRows) {
      const start = page * CATEGORY_PAGE_SIZE;
      setCategories(entry.followedRows.slice(start, start + CATEGORY_PAGE_SIZE));
      setCategoriesTotal(entry.followedRows.length);
      return;
    }
    const rows = entry.pages.get(page);
    if (rows) {
      setCategories(rows);
      setCategoriesTotal(entry.total);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setCategorySearchDebounced(categorySearchInput.trim());
      setCategoryPage(0);
    }, 320);
    return () => window.clearTimeout(t);
  }, [categorySearchInput]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearchDebounced(searchInput.trim());
      setTagPage(0);
    }, 320);
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

  const loadCategories = useCallback(async () => {
    const queryKey = categoriesQueryKey(categoryFilter, categorySort, categorySearchDebounced);
    const cached = categoriesCacheRef.current.get(queryKey);

    if (categoryFilter === 'followed') {
      if (cached?.followedRows) {
        applyCategoryPage(cached, categoryPage);
        setCategoriesBootstrapping(false);
        setCategoriesPagePending(false);
        return;
      }

      const requestId = ++categoriesRequestIdRef.current;
      setCategories([]);
      setCategoriesTotal(0);
      setCategoriesBootstrapping(true);
      setCategoriesPagePending(false);

      try {
        const followed = new Set(readFollowedCategorySlugs(userId));
        if (followed.size === 0) {
          if (categoriesRequestIdRef.current !== requestId) return;
          const entry: CategoriesCacheEntry = {
            total: 0,
            pages: new Map(),
            followedRows: [],
          };
          categoriesCacheRef.current.set(queryKey, entry);
          setCategories([]);
          setCategoriesTotal(0);
          return;
        }

        const matched: BlogTaxonomyRow[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const page = await fetchCategoriesList({
            offset,
            limit: CATEGORY_FETCH_CHUNK,
            sort: categorySort,
            q: categorySearchDebounced || undefined,
          });
          if (categoriesRequestIdRef.current !== requestId) return;

          for (const row of page.list) {
            if (followed.has(row.slug.toLowerCase())) {
              matched.push(mapCategoryRow(row));
            }
          }

          hasMore = page.hasMore;
          offset += page.list.length;
        }

        const entry: CategoriesCacheEntry = {
          total: matched.length,
          pages: new Map(),
          followedRows: matched,
        };
        categoriesCacheRef.current.set(queryKey, entry);
        if (categoriesRequestIdRef.current !== requestId) return;
        applyCategoryPage(entry, categoryPage);
      } catch (e) {
        if (categoriesRequestIdRef.current !== requestId) return;
        toastApiError(e, 'Could not load categories');
        setCategories([]);
        setCategoriesTotal(0);
      } finally {
        if (categoriesRequestIdRef.current === requestId) {
          setCategoriesBootstrapping(false);
          setCategoriesPagePending(false);
        }
      }
      return;
    }

    const pageRows = cached?.pages.get(categoryPage);
    if (pageRows) {
      setCategories(pageRows);
      setCategoriesTotal(cached!.total);
      setCategoriesBootstrapping(false);
      setCategoriesPagePending(false);
      return;
    }

    const requestId = ++categoriesRequestIdRef.current;
    const showBootstrap = !cached;
    if (showBootstrap) {
      setCategories([]);
      setCategoriesTotal(0);
      setCategoriesBootstrapping(true);
      setCategoriesPagePending(false);
    } else {
      setCategoriesBootstrapping(false);
      setCategoriesPagePending(true);
    }

    try {
      const page = await fetchCategoriesList({
        offset: categoryPage * CATEGORY_PAGE_SIZE,
        limit: CATEGORY_PAGE_SIZE,
        sort: categorySort,
        q: categorySearchDebounced || undefined,
      });
      if (categoriesRequestIdRef.current !== requestId) return;

      const rows = page.list.map(mapCategoryRow);
      const entry: CategoriesCacheEntry = cached ?? { total: page.total, pages: new Map() };
      entry.total = page.total;
      entry.pages.set(categoryPage, rows);
      categoriesCacheRef.current.set(queryKey, entry);

      setCategories(rows);
      setCategoriesTotal(page.total);
    } catch (e) {
      if (categoriesRequestIdRef.current !== requestId) return;
      toastApiError(e, 'Could not load categories');
      if (showBootstrap) {
        setCategories([]);
        setCategoriesTotal(0);
      }
    } finally {
      if (categoriesRequestIdRef.current === requestId) {
        setCategoriesBootstrapping(false);
        setCategoriesPagePending(false);
      }
    }
  }, [
    categoryPage,
    categorySort,
    categorySearchDebounced,
    categoryFilter,
    userId,
    applyCategoryPage,
  ]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const onFollowedChanged = () => {
      for (const key of categoriesCacheRef.current.keys()) {
        if (key.startsWith('followed|')) categoriesCacheRef.current.delete(key);
      }
      if (categoryFilter === 'followed') void loadCategories();
    };
    window.addEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onFollowedChanged);
    return () => window.removeEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onFollowedChanged);
  }, [categoryFilter, loadCategories]);

  const loadTags = useCallback(async () => {
    const queryKey = tagsQueryKey(tagSort, searchDebounced);
    const cached = tagsCacheRef.current.get(queryKey);
    const pageRows = cached?.pages.get(tagPage);

    if (pageRows) {
      setTags(pageRows);
      setTagsTotal(cached!.total);
      setTagsBootstrapping(false);
      setTagsPagePending(false);
      return;
    }

    const requestId = ++tagsRequestIdRef.current;
    const showBootstrap = !cached;
    if (showBootstrap) {
      setTags([]);
      setTagsTotal(0);
      setTagsBootstrapping(true);
      setTagsPagePending(false);
    } else {
      setTagsBootstrapping(false);
      setTagsPagePending(true);
    }

    try {
      const page = await fetchTagsList({
        offset: tagPage * TAG_PAGE_SIZE,
        limit: TAG_PAGE_SIZE,
        sort: tagSort,
        q: searchDebounced || undefined,
      });
      if (tagsRequestIdRef.current !== requestId) return;

      const entry: TagsCacheEntry = cached ?? { total: page.total, pages: new Map() };
      entry.total = page.total;
      entry.pages.set(tagPage, page.list);
      tagsCacheRef.current.set(queryKey, entry);

      setTags(page.list);
      setTagsTotal(page.total);
    } catch (e) {
      if (tagsRequestIdRef.current !== requestId) return;
      toastApiError(e, 'Could not load tags');
      if (showBootstrap) {
        setTags([]);
        setTagsTotal(0);
      }
    } finally {
      if (tagsRequestIdRef.current === requestId) {
        setTagsBootstrapping(false);
        setTagsPagePending(false);
      }
    }
  }, [tagPage, tagSort, searchDebounced]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  const categoryTotalPages = Math.max(1, Math.ceil(categoriesTotal / CATEGORY_PAGE_SIZE));
  const tagTotalPages = Math.max(1, Math.ceil(tagsTotal / TAG_PAGE_SIZE));

  useEffect(() => {
    if (categoryPage > categoryTotalPages - 1) {
      setCategoryPage(Math.max(0, categoryTotalPages - 1));
    }
  }, [categoryPage, categoryTotalPages]);

  useEffect(() => {
    if (tagPage > tagTotalPages - 1) {
      setTagPage(Math.max(0, tagTotalPages - 1));
    }
  }, [tagPage, tagTotalPages]);

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

        <section aria-label="All categories" className="min-w-0 space-y-3">
          <RailSectionSubheader
            label="All categories"
            text={
              categoriesBootstrapping ? (
                <RailCountPillLoading />
              ) : categorySearchDebounced ? (
                <RailCountPillPair
                  primary={categories.length}
                  secondary={categoriesTotal}
                  primaryLabel={`${categories.length} loaded`}
                  secondaryLabel={`${categoriesTotal} matching`}
                />
              ) : (
                <RailCountPill
                  count={categoriesTotal}
                  aria-label={`${categoriesTotal} categories`}
                />
              )
            }
            search={{
              value: categorySearchInput,
              onChange: setCategorySearchInput,
              placeholder: 'Search categories…',
              ariaLabel: 'Search categories',
              disabled: categoriesBootstrapping,
            }}
            sort={{
              id: 'topics-all-categories-sort',
              value: categorySort,
              onChange: (v) => {
                setCategorySort(v as CategoryListSort);
                setCategoryPage(0);
              },
              options: CATEGORY_SORT_OPTIONS,
              placeholder: 'Sort',
              disabled: categoriesBootstrapping,
            }}
            filter={{
              id: 'topics-all-categories-filter',
              value: categoryFilter,
              onChange: (v) => {
                setCategoryFilter(v as CategoryListFilter);
                setCategoryPage(0);
              },
              options: CATEGORY_FILTER_OPTIONS,
              placeholder: 'Filter',
              disabled: categoriesBootstrapping,
            }}
          />
          <div aria-busy={categoriesPagePending}>
            {categoriesBootstrapping ? (
              <CategoryGridSkeleton />
            ) : categoriesTotal === 0 && !categorySearchDebounced ? (
              <RailFeedEmptyState
                icon={Layers}
                title="No categories in taxonomy yet"
                description="When staff publish taxonomy categories and writers file stories under them, they will show up here."
              />
            ) : categoryFilter === 'followed' && categoriesTotal === 0 ? (
              <RailFeedEmptyState
                icon={Layers}
                title="No followed categories"
                description="Follow categories from the cards above or category feeds — they will show up here."
              />
            ) : categories.length === 0 ? (
              <RailFeedEmptyState
                icon={Layers}
                variant="filter"
                title="No categories match your search"
                description="Try a different keyword or clear the search field."
                actions={[{ label: 'Clear search', onClick: () => setCategorySearchInput('') }]}
              />
            ) : (
              <>
                <div
                  className={cn(
                    'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
                    categoriesPagePending && 'pointer-events-none opacity-60'
                  )}
                >
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
                {categoriesTotal > 0 ? (
                  <RailListPaginationFooter
                    className="mt-4"
                    page={categoryPage}
                    pageSize={CATEGORY_PAGE_SIZE}
                    total={categoriesTotal}
                    onPageChange={setCategoryPage}
                    disabled={categoriesBootstrapping || categoriesPagePending}
                  />
                ) : null}
              </>
            )}
          </div>
        </section>

        <section aria-label="All tags" className="min-w-0 space-y-3">
          <RailSectionSubheader
            label="All tags"
            text={
              tagsBootstrapping ? (
                <RailCountPillLoading />
              ) : searchDebounced ? (
                <RailCountPillPair
                  primary={tags.length}
                  secondary={tagsTotal}
                  primaryLabel={`${tags.length} loaded`}
                  secondaryLabel={`${tagsTotal} matching`}
                />
              ) : (
                <RailCountPill count={tagsTotal} aria-label={`${tagsTotal} tags`} />
              )
            }
            search={{
              value: searchInput,
              onChange: setSearchInput,
              placeholder: 'Search tags…',
              ariaLabel: 'Search tags',
              disabled: tagsBootstrapping,
            }}
            sort={{
              id: 'topics-all-tags-sort',
              value: tagSort,
              onChange: (v) => {
                setTagSort(v as TagListSort);
                setTagPage(0);
              },
              options: TAG_SORT_OPTIONS,
              placeholder: 'Sort',
              disabled: tagsBootstrapping,
            }}
          />
          <div aria-busy={tagsPagePending}>
            {tagsBootstrapping ? (
              <TagListSkeleton count={TAG_PAGE_SIZE} />
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
                <div
                  className={cn(
                    'flex flex-wrap gap-x-3 gap-y-2',
                    tagsPagePending && 'pointer-events-none opacity-60'
                  )}
                >
                  {tags.map((t) => (
                    <HashtagBadgeLink
                      key={t.slug}
                      slug={t.slug}
                      label={t.name}
                      postCount={t.postCount}
                    />
                  ))}
                </div>
                {tagsTotal > 0 ? (
                  <RailListPaginationFooter
                    className="mt-4"
                    page={tagPage}
                    pageSize={TAG_PAGE_SIZE}
                    total={tagsTotal}
                    onPageChange={setTagPage}
                    disabled={tagsBootstrapping || tagsPagePending}
                  />
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
