'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { blogApi } from '@/api/blog';
import { fetchTagsExplore, type TagExploreRow } from '@/api/tagsExplore';
import { ShellPageIntroHeader } from '@/components/layout/ShellPageIntroHeader';
import { FeaturedCategoryCard } from '@/components/explore/FeaturedCategoryCard';
import { RankCountPill } from '@/components/topics/RankCountPill';
import { SearchField } from '@/components/ui/SearchField';
import { HashtagBadgeLink } from '@/components/tags/HashtagBadgeLink';
import { BlogApiConnectionError } from '@/lib/blogAuthFetch';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';
import { cn } from '@/lib/utils';
import type { BlogTaxonomyRow } from '@/types/blog';

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((m) => m.DotLottieReact),
  { ssr: false },
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
  'inline-flex max-w-full min-w-0 items-center rounded-none px-2.5 py-1 font-mono text-[12px] font-medium tracking-tight text-foreground transition-colors hover:bg-primary hover:text-primary-foreground';

type TagSort = 'name-asc' | 'name-desc' | 'posts-desc' | 'recent';

const TAG_SORT_OPTIONS: ReadonlyArray<{ value: TagSort; label: string; shortLabel: string }> = [
  { value: 'name-asc', label: 'Name A–Z', shortLabel: 'A–Z' },
  { value: 'name-desc', label: 'Name Z–A', shortLabel: 'Z–A' },
  { value: 'posts-desc', label: 'Most posts', shortLabel: 'Posts' },
  { value: 'recent', label: 'Recently used', shortLabel: 'Recent' },
];

function TagsSortDropdown({
  value,
  onChange,
}: Readonly<{
  value: TagSort;
  onChange: (v: TagSort) => void;
}>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const label = TAG_SORT_OPTIONS.find((o) => o.value === value)?.label ?? TAG_SORT_OPTIONS[0].label;
  const shortLabel = TAG_SORT_OPTIONS.find((o) => o.value === value)?.shortLabel ?? TAG_SORT_OPTIONS[0].shortLabel;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        title={label}
        aria-label={`Sort tags: ${label}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className="flex h-[42px] w-[7.25rem] shrink-0 items-center justify-between gap-1.5 rounded-none border-2 border-border bg-background px-2 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-foreground outline-none ring-primary focus-visible:ring-2 sm:w-[8.25rem]"
      >
        <span className="min-w-0 truncate">{shortLabel}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-full overflow-hidden border-2 border-border bg-card py-1 shadow-[4px_4px_0_0_var(--border)]"
        >
          {TAG_SORT_OPTIONS.map((o) => (
            <li key={o.value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={value === o.value}
                className={cn(
                  'flex w-full px-3 py-2.5 text-left font-mono text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-muted/60',
                  value === o.value && 'bg-primary/10 text-primary',
                )}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
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
            <span className="w-6 shrink-0 tabular-nums text-[12px] font-semibold text-muted-foreground">{i + 1}</span>
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
        <p className="mt-4 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">No tags yet.</p>
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
            <span className="w-6 shrink-0 tabular-nums text-[12px] font-semibold text-muted-foreground">{i + 1}</span>
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
        <p className="mt-4 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">No categories yet.</p>
      ) : null}
    </div>
  );
}

function compareTags(a: TagExploreRow, b: TagExploreRow, sort: TagSort): number {
  switch (sort) {
    case 'name-asc':
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    case 'name-desc':
      return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
    case 'posts-desc':
      return b.postCount - a.postCount || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    case 'recent': {
      const ta = a.lastUsedAt ? Date.parse(a.lastUsedAt) : 0;
      const tb = b.lastUsedAt ? Date.parse(b.lastUsedAt) : 0;
      if (tb !== ta) return tb - ta;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    default:
      return 0;
  }
}

export default function TopicsPage() {
  const [trending, setTrending] = useState<TagExploreRow[]>([]);
  const [popular, setPopular] = useState<TagExploreRow[]>([]);
  const [categories, setCategories] = useState<BlogTaxonomyRow[]>([]);
  const [allTags, setAllTags] = useState<TagExploreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [tagSort, setTagSort] = useState<TagSort>('name-asc');

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchInput.trim().toLowerCase()), 320);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, tax] = await Promise.all([fetchTagsExplore(), blogApi.getTaxonomy()]);
      setTrending(r.trending);
      setPopular(r.popular);
      setAllTags(r.allTags);
      setCategories(tax.categories ?? []);
    } catch (e) {
      toastApiError(e, 'Could not load topics');
      setTrending([]);
      setPopular([]);
      setAllTags([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const popularCategories = useMemo(
    () => [...categories].sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name)),
    [categories],
  );

  const allCategoriesSorted = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [categories],
  );

  const filteredSortedTags = useMemo(() => {
    const q = searchDebounced;
    let list = allTags;
    if (q) {
      list = allTags.filter(
        (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => compareTags(a, b, tagSort));
  }, [allTags, searchDebounced, tagSort]);

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <ShellPageIntroHeader
          breadcrumbItems={[{ href: '/', label: 'Home' }, { label: 'Topics' }]}
          description="Browse taxonomy categories and tags writers use — open a category for its post stream, or a tag for that tag’s stories."
          title={
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
              Explore{' '}
              <span className="text-primary underline decoration-4 underline-offset-4 sm:decoration-6 sm:underline-offset-6">
                topics.
              </span>
            </h1>
          }
        />

        {loading ? (
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
              headerStart={<Layers className="size-6 shrink-0 text-primary" strokeWidth={2.25} aria-hidden />}
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
            {loading ? (
              <div className="h-24 animate-pulse rounded-none bg-muted/30" aria-hidden />
            ) : allCategoriesSorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories in taxonomy yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allCategoriesSorted.map((c) => (
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
            )}
          </div>
        </section>

        <section aria-labelledby="all-tags-heading" className="min-w-0 space-y-3">
          <div >
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
                <TagsSortDropdown value={tagSort} onChange={setTagSort} />
              </div>
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-24 animate-pulse rounded-none bg-muted/30" aria-hidden />
            ) : allTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags published yet.</p>
            ) : filteredSortedTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags match your search.</p>
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {filteredSortedTags.map((t) => (
                  <HashtagBadgeLink key={t.slug} slug={t.slug} label={t.name} postCount={t.postCount} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
