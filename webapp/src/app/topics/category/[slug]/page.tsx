'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Compass, FileStack, Layers } from 'lucide-react';
import { blogApi } from '@/api/blog';
import { BlogCard } from '@/components/blog/BlogCard';
import { RailFeedEmptyState } from '@/components/layout/RailFeedEmptyState';
import {
  RailSectionSubheader,
  type RailSectionSubheaderSortProps,
} from '@/components/layout/RailSectionSubheader';
import { ShellPageIntroHeader } from '@/components/layout/ShellPageIntroHeader';
import { FollowingPostsGridSkeleton } from '@/components/skeletons/FollowingPageSkeleton';
import { mapPublicFeedPostToPost } from '@/lib/mapFeedPostToPost';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';
import { cn } from '@/lib/utils';
import type { BlogTaxonomyRow } from '@/types/blog';
import type { Post } from '@/types';

type PostSort = 'newest' | 'oldest' | 'title-asc';

const CATEGORY_SORT_OPTIONS: RailSectionSubheaderSortProps['options'] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title-asc', label: 'Title A–Z' },
];

function displayCategoryTitle(slug: string, taxonomyName?: string): string {
  const t = taxonomyName?.trim();
  if (t) return t;
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function comparePosts(a: Post, b: Post, sort: PostSort): number {
  switch (sort) {
    case 'oldest': {
      const ta = Date.parse(a.publishedAt) || 0;
      const tb = Date.parse(b.publishedAt) || 0;
      return ta - tb || a.title.localeCompare(b.title);
    }
    case 'title-asc':
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    case 'newest':
    default: {
      const ta = Date.parse(a.publishedAt) || 0;
      const tb = Date.parse(b.publishedAt) || 0;
      return tb - ta || a.title.localeCompare(b.title);
    }
  }
}

/** Category stream under Topics: `/topics/category/{slug}`. */
export default function TopicsCategoryFeedPage() {
  const params = useParams();
  const raw = params?.slug;
  const categorySlug = typeof raw === 'string' ? decodeURIComponent(raw) : '';
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<BlogTaxonomyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [postSort, setPostSort] = useState<PostSort>('newest');

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchInput.trim().toLowerCase()), 280);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    if (!categorySlug) {
      setLoading(false);
      setPosts([]);
      setCategories([]);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const [{ posts: rawPosts }, tax] = await Promise.all([
        blogApi.getPublishedFeed(48, { category: categorySlug }),
        blogApi.getTaxonomy(),
      ]);
      setPosts(rawPosts.map(mapPublicFeedPostToPost));
      setCategories(tax.categories ?? []);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not load posts');
      setPosts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [categorySlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const taxonomyRow = useMemo(
    () => categories.find((c) => c.slug.toLowerCase() === categorySlug.toLowerCase()),
    [categories, categorySlug],
  );

  const displayTitle = useMemo(
    () => displayCategoryTitle(categorySlug, taxonomyRow?.name),
    [categorySlug, taxonomyRow?.name],
  );

  const totalIndexed = taxonomyRow?.postCount ?? posts.length;

  const filteredSortedPosts = useMemo(() => {
    const q = searchDebounced;
    let list = posts;
    if (q) {
      list = posts.filter((p) => {
        const hay = `${p.title} ${p.excerpt} ${p.author?.name ?? ''} ${p.author?.username ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return [...list].sort((a, b) => comparePosts(a, b, postSort));
  }, [posts, searchDebounced, postSort]);

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <ShellPageIntroHeader
          breadcrumbItems={[
            { href: '/', label: 'Home' },
            { href: '/topics', label: 'Topics' },
            { label: displayTitle },
          ]}
          description="Stories published in this taxonomy category across the community."
          title={
            <h1 className="flex items-center gap-2 text-2xl font-black uppercase italic tracking-tighter text-foreground sm:text-3xl lg:text-4xl">
              <Layers className="size-7 shrink-0 text-primary sm:size-8" strokeWidth={2.5} aria-hidden />
              <span className="min-w-0 break-words normal-case italic tracking-tight text-foreground uppercase ">
                {displayTitle}
              </span>
            </h1>
          }
        />

        {errorMsg ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMsg}
          </p>
        ) : null}

        {!categorySlug ? (
          <p className="text-sm text-muted-foreground">Invalid category.</p>
        ) : (
          <>
            <RailSectionSubheader
              label="Total posts"
              text={
                <span className="text-muted-foreground">
                  {loading
                    ? '—'
                    : searchDebounced
                      ? `${filteredSortedPosts.length} of ${posts.length} posts`
                      : `${totalIndexed > 999 ? '999+' : totalIndexed.toLocaleString()} ${totalIndexed === 1 ? 'post' : 'posts'}`}
                </span>
              }
              search={{
                value: searchInput,
                onChange: setSearchInput,
                placeholder: 'Search posts…',
                ariaLabel: 'Search posts in this category',
              }}
              sort={{
                id: `topics-category-sort-${categorySlug}`,
                value: postSort,
                onChange: (v) => setPostSort(v as PostSort),
                options: CATEGORY_SORT_OPTIONS,
                placeholder: 'Sort',
              }}
            />

            <section aria-label="Posts in this category" className="min-w-0">
              {loading ? (
                <FollowingPostsGridSkeleton />
              ) : posts.length === 0 ? (
                <RailFeedEmptyState
                  icon={FileStack}
                  title="No published posts yet"
                  description="Nothing has been filed under this category on the public feed. Try another category or open the topics hub."
                  actions={[
                    {
                      label: 'Browse topics',
                      href: '/topics',
                      variant: 'primary',
                      icon: <Compass className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />,
                    },
                  ]}
                />
              ) : filteredSortedPosts.length === 0 ? (
                <RailFeedEmptyState
                  icon={FileStack}
                  variant="filter"
                  title="No matching posts"
                  description="Try a different search term or clear the filter."
                  actions={[{ label: 'Clear search', onClick: () => setSearchInput('') }]}
                />
              ) : (
                <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
                  {filteredSortedPosts.map((post) => (
                    <li key={post.id} className="flex min-h-0">
                      <BlogCard post={post} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
