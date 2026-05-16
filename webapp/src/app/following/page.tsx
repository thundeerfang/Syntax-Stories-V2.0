'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Users } from 'lucide-react';
import { blogApi } from '@/api/blog';
import { followApi, type FollowUser } from '@/api/follow';
import { BlogCard } from '@/features/blog';
import {
  RailFeedEmptyState,
  RailFeedErrorState,
  RailSectionSubheader,
  ShellPageIntroHeader,
} from '@/components/layout';
import { FollowingPostsGridSkeleton, FollowingToolbarSkeleton } from '@/components/skeletons';
import { useAuthStore } from '@/store/auth';
import { mapPublicFeedPostToPost } from '@/lib/blog/mapFeedPostToPost';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';
import type { Post } from '@/types';
import type { PublicFeedPost } from '@/types/blog';

const LOGIN_NEXT = '/following';

function chipAvatarSrc(profileImg: string | undefined, username: string): string {
  const trimmed = profileImg?.trim();
  if (!trimmed) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${trimmed}`;
}

function parsePostTime(p: PublicFeedPost): number {
  const raw = p.createdAt?.trim() ? p.createdAt : p.updatedAt;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function mergeFollowingPosts(batches: PublicFeedPost[][], maxTotal: number): PublicFeedPost[] {
  const map = new Map<string, PublicFeedPost>();
  for (const batch of batches) {
    for (const p of batch) map.set(p._id, p);
  }
  return [...map.values()].sort((a, b) => parsePostTime(b) - parsePostTime(a)).slice(0, maxTotal);
}

function chipHandleLabel(username: string): string {
  return `@${username.trim().toLowerCase()}`;
}

/** Primary line in search rows: full name in all caps, or username if no name. */
function searchPrimaryLabel(u: FollowUser): string {
  const name = u.fullName?.trim();
  if (name) return name.toUpperCase();
  return u.username.toUpperCase();
}

export default function FollowingPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const me = user?.username?.trim();

  const [following, setFollowing] = useState<FollowUser[]>([]);
  /** Up to five follows for quick chips: oldest relationships first, then shuffled on the server. */
  const [followingChipUsers, setFollowingChipUsers] = useState<FollowUser[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingNext, setFollowingNext] = useState<string | null>(null);
  const [followingError, setFollowingError] = useState<string | null>(null);

  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  const loadFollowingPage = useCallback(
    async (cursor: string | null) => {
      if (!me) return;
      setFollowingLoading(true);
      setFollowingError(null);
      try {
        if (!cursor) {
          const [res, chipRes] = await Promise.all([
            followApi.getFollowing(me, null, 50),
            followApi.getFollowing(me, null, 5, { order: 'asc', shuffle: true }),
          ]);
          if (!res.success) throw new Error('Could not load following');
          setFollowing(res.list);
          setFollowingNext(res.nextCursor ?? null);
          setFollowingChipUsers(chipRes.success ? chipRes.list : []);
          return;
        }
        const res = await followApi.getFollowing(me, cursor, 50);
        if (!res.success) throw new Error('Could not load following');
        setFollowing((prev) => [...prev, ...res.list]);
        setFollowingNext(res.nextCursor ?? null);
      } catch (e) {
        setFollowingError(e instanceof Error ? e.message : 'Failed to load');
        if (!cursor) {
          setFollowing([]);
          setFollowingChipUsers([]);
        }
      } finally {
        setFollowingLoading(false);
      }
    },
    [me],
  );

  useEffect(() => {
    if (!isHydrated || !me || !token) return;
    void loadFollowingPage(null);
  }, [isHydrated, me, token, loadFollowingPage]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const loadPosts = useCallback(async () => {
    if (!me || following.length === 0) {
      setPosts([]);
      return;
    }
    setPostsLoading(true);
    setPostsError(null);
    try {
      if (selectedUsername) {
        const res = await blogApi.getUserPublishedPosts(selectedUsername, 36, token);
        if (!res.success) throw new Error('Could not load posts');
        setPosts(res.posts.map(mapPublicFeedPostToPost));
        return;
      }
      const perAuthor = 10;
      const batches = await Promise.all(
        following.map((u) =>
          blogApi.getUserPublishedPosts(u.username, perAuthor, token).then((r) => r.posts ?? []),
        ),
      );
      const merged = mergeFollowingPosts(batches, 48);
      setPosts(merged.map(mapPublicFeedPostToPost));
    } catch (e) {
      setPostsError(e instanceof Error ? e.message : 'Could not load posts');
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [me, following, selectedUsername, token]);

  useEffect(() => {
    if (!isHydrated || !me || !token) return;
    if (followingLoading && following.length === 0) return;
    if (following.length === 0 && !followingLoading) {
      setPosts([]);
      return;
    }
    void loadPosts();
  }, [isHydrated, me, token, following, followingLoading, loadPosts]);

  const filteredSidebar = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase();
    if (!q) return following;
    return following.filter(
      (u) =>
        u.username.toLowerCase().includes(q) || (u.fullName ?? '').toLowerCase().includes(q),
    );
  }, [following, sidebarQuery]);

  const pickFollowingUser = useCallback((u: FollowUser) => {
    setSelectedUsername(u.username);
    setSidebarQuery('');
    setSearchOpen(false);
  }, []);

  const railButtons = useMemo(
    () => [
      {
        label: 'Everyone',
        onClick: () => setSelectedUsername(null),
        variant: selectedUsername === null ? ('primary' as const) : ('default' as const),
        ariaLabel: 'Everyone you follow',
      },
      ...followingChipUsers.map((u) => ({
        label: (
          <span className="inline-flex max-w-[8.5rem] items-center gap-1.5 normal-case tracking-normal">
            <img
              src={chipAvatarSrc(u.profileImg, u.username)}
              alt=""
              className="size-5 shrink-0 border border-border object-cover"
            />
            <span className="truncate">{searchPrimaryLabel(u)}</span>
          </span>
        ),
        onClick: () => setSelectedUsername(u.username),
        variant: selectedUsername === u.username ? ('primary' as const) : ('default' as const),
        ariaLabel: `Posts from @${u.username}`,
      })),
    ],
    [followingChipUsers, selectedUsername],
  );

  const showGate = isHydrated && (!token || !me);

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <ShellPageIntroHeader
          breadcrumbItems={[{ href: '/', label: 'Home' }, { label: 'Following' }]}
          description="Pick someone to read their latest posts, or browse everyone you follow in one stream."
          title={
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
              Writers you{' '}
              <span className="text-primary underline decoration-4 underline-offset-4 sm:decoration-6 sm:underline-offset-6">
                follow.
              </span>
            </h1>
          }
        />

        {!isHydrated ? (
          <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8" aria-busy="true">
            <FollowingToolbarSkeleton />
            <section aria-label="Loading posts" className="min-w-0">
              <FollowingPostsGridSkeleton />
            </section>
          </div>
        ) : showGate ? (
          <div className="max-w-lg space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in to see authors you follow and their latest posts.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(LOGIN_NEXT)}`}
              className="inline-block border-2 border-border bg-primary px-4 py-2 font-mono text-[10px] font-black uppercase tracking-wide text-primary-foreground shadow transition-transform hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Sign in
            </Link>
          </div>
        ) : followingLoading && following.length === 0 ? (
          <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8" aria-busy="true">
            <FollowingToolbarSkeleton />
            <section aria-label="Loading posts" className="min-w-0">
              <FollowingPostsGridSkeleton />
            </section>
          </div>
        ) : followingError ? (
          <p className="text-sm text-destructive">{followingError}</p>
        ) : following.length === 0 ? (
          <RailFeedEmptyState
            icon={Users}
            title="You are not following anyone yet"
            description="Discover writers and topics to build your feed."
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
          <>
            <div ref={searchWrapRef} className="relative">
              <RailSectionSubheader
                buttons={railButtons}
                search={{
                  value: sidebarQuery,
                  onChange: (v) => {
                    setSidebarQuery(v);
                    setSearchOpen(true);
                  },
                  onFocus: () => setSearchOpen(true),
                  placeholder: 'Search people you follow…',
                  ariaLabel: 'Search people you follow',
                }}
              />
              {searchOpen ? (
                <div
                  id="following-search-results"
                  role="listbox"
                  className="absolute right-3 top-[calc(100%+4px)] z-50 max-h-60 w-[min(100%,18rem)] overflow-y-auto overscroll-contain border-2 border-border bg-card py-1 shadow sm:right-4 sm:w-72"
                >
                  {filteredSidebar.length === 0 ? (
                    <p className="px-3 py-3 font-mono text-[11px] text-muted-foreground">No matches.</p>
                  ) : (
                    filteredSidebar.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        role="option"
                        aria-selected={selectedUsername === u.username}
                        className={cn(
                          'flex w-full items-center gap-3 px-2 py-2 text-left font-mono text-[11px] transition-colors hover:bg-muted/50',
                          selectedUsername === u.username && 'bg-primary/[0.08]',
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickFollowingUser(u)}
                      >
                        <img
                          src={chipAvatarSrc(u.profileImg, u.username)}
                          alt=""
                          className="size-9 shrink-0 border border-border object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-black uppercase tracking-tight text-foreground">
                            {searchPrimaryLabel(u)}
                          </span>
                          <span className="block truncate font-mono text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                            {chipHandleLabel(u.username)}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            {followingNext ? (
              <button
                type="button"
                onClick={() => void loadFollowingPage(followingNext)}
                disabled={followingLoading}
                className="w-fit font-mono text-[10px] font-bold uppercase tracking-wide text-primary underline-offset-4 hover:underline disabled:opacity-50"
              >
                {followingLoading ? 'Loading…' : 'Load more people you follow'}
              </button>
            ) : null}

            <section
              aria-label="Posts from people you follow"
              className="min-w-0"
              aria-busy={postsLoading || undefined}
            >
              {postsLoading ? (
                <FollowingPostsGridSkeleton />
              ) : postsError ? (
                <RailFeedErrorState
                  title="Could not load posts"
                  description={postsError}
                  onRetry={() => void loadPosts()}
                />
              ) : posts.length === 0 ? (
                <RailFeedEmptyState
                  icon={Users}
                  title={
                    selectedUsername
                      ? `No posts from @${selectedUsername} yet`
                      : 'No posts from your follows yet'
                  }
                  description={
                    selectedUsername
                      ? 'They may not have published anything yet—or switch back to everyone you follow.'
                      : 'When writers you follow publish, their latest stories will appear in this stream.'
                  }
                  actions={
                    selectedUsername
                      ? [{ label: 'Browse everyone', onClick: () => setSelectedUsername(null) }]
                      : [
                          {
                            label: 'Browse topics',
                            href: '/topics',
                            variant: 'primary',
                            icon: <Compass className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />,
                          },
                        ]
                  }
                />
              ) : (
                <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
                  {posts.map((post) => (
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
