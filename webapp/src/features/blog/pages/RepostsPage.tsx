'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Compass, Repeat2 } from 'lucide-react';
import { repostsApi } from '@/api/reposts';
import { BlogCard } from '@/features/blog';
import {
  RailFeedEmptyState,
  RailFeedErrorState,
  RailSectionSubheader,
  ShellPageIntroHeader,
  type RailSectionSubheaderSortProps,
} from '@/components/layout';
import { FollowingPostsGridSkeleton, FollowingToolbarSkeleton } from '@/components/skeletons';
import { useAuthStore } from '@/store/auth';
import { mapPublicFeedPostToPost } from '@/lib/blog/mapFeedPostToPost';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';
import type { Post } from '@/types';


const LOGIN_NEXT = '/reposts';

type RepostSort = 'newest' | 'oldest';

const REPOST_SORT_OPTIONS: RailSectionSubheaderSortProps['options'] = [
  { value: 'newest', label: 'Newest repost' },
  { value: 'oldest', label: 'Oldest repost' },
];

export default function RepostsPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [repostSort, setRepostSort] = useState<RepostSort>('newest');

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchInput.trim().toLowerCase()), 280);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const loadPosts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { posts: raw } = await repostsApi.listRepostedPosts(token, {
        limit: 80,
        sort: repostSort,
      });
      setPosts(raw.map(mapPublicFeedPostToPost));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not load reposts');
      setPosts([]);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [token, repostSort]);

  useEffect(() => {
    if (!isHydrated || !token || !user) return;
    void loadPosts();
  }, [isHydrated, token, user, loadPosts]);

  const filteredPosts = useMemo(() => {
    if (!searchDebounced) return posts;
    return posts.filter((p) => {
      const hay = `${p.title} ${p.excerpt ?? ''}`.toLowerCase();
      return hay.includes(searchDebounced);
    });
  }, [posts, searchDebounced]);

  const showGate = isHydrated && (!token || !user);
  const showFullPageSkeleton =
    !isHydrated || (Boolean(token && user) && !initialLoadDone && loading);

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <ShellPageIntroHeader
          breadcrumbItems={[{ href: '/', label: 'Home' }, { label: 'Reposts' }]}
          description="Posts you have reposted to your profile. Share what resonates and revisit your curated stream anytime."
          title={
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
              Your{' '}
              <span className="text-primary underline decoration-4 underline-offset-4 sm:decoration-6 sm:underline-offset-6">
                reposts.
              </span>
            </h1>
          }
        />

        {showFullPageSkeleton ? (
          <div
            className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8"
            aria-busy="true"
          >
            <FollowingToolbarSkeleton />
            <section aria-label="Loading reposts" className="min-w-0">
              <FollowingPostsGridSkeleton />
            </section>
          </div>
        ) : showGate ? (
          <div className="max-w-lg space-y-3">
            <p className="text-sm text-muted-foreground">Sign in to see posts you have reposted.</p>
            <Link
              href={`/login?next=${encodeURIComponent(LOGIN_NEXT)}`}
              className="inline-block border-2 border-border bg-primary px-4 py-2 font-mono text-[10px] font-black uppercase tracking-wide text-primary-foreground shadow transition-transform hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <RailSectionSubheader
              text={
                searchDebounced
                  ? `Reposts · ${filteredPosts.length} of ${posts.length}`
                  : `Reposts · ${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`
              }
              search={{
                value: searchInput,
                onChange: setSearchInput,
                placeholder: 'Search reposts',
                ariaLabel: 'Search your reposts',
              }}
              sort={{
                id: 'reposts-sort',
                value: repostSort,
                onChange: (v) => setRepostSort(v as RepostSort),
                options: REPOST_SORT_OPTIONS,
                placeholder: 'Sort',
              }}
            />

            {errorMsg ? (
              <RailFeedErrorState
                title="Could not load reposts"
                description={errorMsg}
                onRetry={() => void loadPosts()}
              />
            ) : null}

            <section aria-label="Your reposts" className="min-w-0">
              {loading ? (
                <FollowingPostsGridSkeleton />
              ) : posts.length === 0 ? (
                <RailFeedEmptyState
                  icon={Repeat2}
                  title="No reposts yet"
                  description="When you repost a story from the feed, it will show up here so you can revisit and share what resonates."
                  actions={[
                    {
                      label: 'Browse topics',
                      href: '/topics',
                      variant: 'primary',
                      icon: <Compass className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />,
                    },
                  ]}
                />
              ) : filteredPosts.length === 0 ? (
                <RailFeedEmptyState
                  icon={Repeat2}
                  variant="filter"
                  title="No matching reposts"
                  description="Try a different search term or clear the filter."
                  actions={[{ label: 'Clear search', onClick: () => setSearchInput('') }]}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPosts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
