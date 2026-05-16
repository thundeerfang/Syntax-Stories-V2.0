'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronDown, Compass, FolderPlus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { bookmarksApi, type BookmarkGroupRow } from '@/api/bookmarks';
import { BlogCard } from '@/components/blog/BlogCard';
import { RailFeedEmptyState } from '@/components/layout/RailFeedEmptyState';
import { ShellPageIntroHeader } from '@/components/layout/ShellPageIntroHeader';
import { FollowingPostsGridSkeleton, FollowingToolbarSkeleton } from '@/components/skeletons/FollowingPageSkeleton';
import { WarningConfirmDialog } from '@/components/ui/delete';
import { Dialog, DIALOG_Z_INDEX_STACKED } from '@/components/ui/Dialog';
import { BlogApiConnectionError } from '@/lib/blogAuthFetch';
import { mapPublicFeedPostToPost } from '@/lib/mapFeedPostToPost';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import type { Post } from '@/types';

const LOGIN_NEXT = '/bookmarks';

const BOOKMARK_SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Newest saved', shortLabel: 'Newest' },
  { value: 'oldest' as const, label: 'Oldest saved', shortLabel: 'Oldest' },
];

function BookmarksSortDropdown({
  value,
  onChange,
}: Readonly<{
  value: 'newest' | 'oldest';
  onChange: (v: 'newest' | 'oldest') => void;
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

  const label = BOOKMARK_SORT_OPTIONS.find((o) => o.value === value)?.label ?? 'Newest saved';
  const shortLabel = BOOKMARK_SORT_OPTIONS.find((o) => o.value === value)?.shortLabel ?? 'Newest';

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        title={label}
        aria-label={`Sort bookmarks: ${label}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className="flex h-[42px] w-[7.25rem] shrink-0 items-center justify-between gap-1.5 rounded-none border-2 border-border bg-background px-2 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-foreground outline-none ring-primary focus-visible:ring-2 sm:w-[7.75rem]"
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
          {BOOKMARK_SORT_OPTIONS.map((o) => (
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

function toastApiError(e: unknown, fallback: string) {
  if (e instanceof BlogApiConnectionError) {
    toast.error(e.message);
    return;
  }
  toast.error(e instanceof Error && e.message ? e.message : fallback);
}

export default function BookmarksPage() {
  const searchParams = useSearchParams();
  const groupFromUrl = searchParams.get('group');

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const [groups, setGroups] = useState<BookmarkGroupRow[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(() => Boolean(useAuthStore.getState().token));
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(() => Boolean(useAuthStore.getState().token));

  const [selectedFilter, setSelectedFilter] = useState<'all' | string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmoji, setCreateEmoji] = useState('');
  const [createMakeDefault, setCreateMakeDefault] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [defaultConfirmOpen, setDefaultConfirmOpen] = useState(false);
  const [pendingDefault, setPendingDefault] = useState<{ id: string; name: string } | null>(null);
  const [defaultConfirming, setDefaultConfirming] = useState(false);

  /** After first successful groups+posts cycle, only the grid shows a loading skeleton (folder bar stays). */
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchInput.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!token) {
      setGroupsLoading(false);
      setPostsLoading(false);
      setInitialLoadDone(false);
    } else {
      setGroupsLoading(true);
      setPostsLoading(true);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      setInitialLoadDone(false);
      return;
    }
    if (!groupsLoading && !postsLoading) setInitialLoadDone(true);
  }, [token, user, groupsLoading, postsLoading]);

  const loadGroups = useCallback(async () => {
    if (!token) return;
    setGroupsLoading(true);
    try {
      const { groups: g } = await bookmarksApi.listGroups(token);
      setGroups(g);
    } catch (e) {
      toastApiError(e, 'Could not load folders');
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }, [token]);

  const loadPosts = useCallback(async () => {
    if (!token) return;
    setPostsLoading(true);
    try {
      const groupParam = selectedFilter === 'all' ? undefined : selectedFilter;
      const { posts: raw } = await bookmarksApi.listBookmarkedPosts(token, {
        groupId: groupParam,
        q: searchDebounced || undefined,
        limit: 80,
        sort: sortOrder,
      });
      setPosts(raw.map(mapPublicFeedPostToPost));
    } catch (e) {
      toastApiError(e, 'Could not load bookmarks');
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [token, selectedFilter, searchDebounced, sortOrder]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!groupFromUrl || groups.length === 0) return;
    if (groups.some((g) => g._id === groupFromUrl)) {
      setSelectedFilter(groupFromUrl);
    }
  }, [groupFromUrl, groups]);

  useEffect(() => {
    if (!token) return;
    void loadPosts();
  }, [token, loadPosts]);

  const handleCreateGroup = useCallback(async () => {
    if (!token || !createName.trim()) return;
    setCreateSubmitting(true);
    try {
      await bookmarksApi.createGroup(createName.trim(), token, {
        emoji: createEmoji.trim() || undefined,
        makeDefault: createMakeDefault,
      });
      setCreateOpen(false);
      setCreateName('');
      setCreateEmoji('');
      setCreateMakeDefault(false);
      await loadGroups();
      toast.success('Folder created');
    } catch (e) {
      toastApiError(e, 'Could not create folder');
    } finally {
      setCreateSubmitting(false);
    }
  }, [token, createName, createEmoji, createMakeDefault, loadGroups]);

  const closeDefaultConfirm = useCallback(() => {
    if (defaultConfirming) return;
    setDefaultConfirmOpen(false);
    setPendingDefault(null);
  }, [defaultConfirming]);

  const openDefaultConfirm = useCallback((g: BookmarkGroupRow) => {
    if (g.isDefault) return;
    setPendingDefault({ id: g._id, name: g.name });
    setDefaultConfirmOpen(true);
  }, []);

  const confirmSetDefault = useCallback(async () => {
    if (!token || !pendingDefault) return;
    setDefaultConfirming(true);
    try {
      await bookmarksApi.setDefaultGroup(pendingDefault.id, token);
      await loadGroups();
      setDefaultConfirmOpen(false);
      setPendingDefault(null);
    } catch (e) {
      toastApiError(e, 'Could not update default folder');
    } finally {
      setDefaultConfirming(false);
    }
  }, [token, pendingDefault, loadGroups]);

  const showGate = isHydrated && (!token || !user);

  const showFullPageSkeleton =
    !isHydrated ||
    (Boolean(token && user) && !initialLoadDone && (groupsLoading || postsLoading));

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <ShellPageIntroHeader
          breadcrumbItems={[{ href: '/', label: 'Home' }, { label: 'Bookmarks' }]}
          description="Organize posts you save into folders. Pick a default folder — new bookmarks from feeds land there automatically."
          title={
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
              Your{' '}
              <span className="text-primary underline decoration-4 underline-offset-4 sm:decoration-6 sm:underline-offset-6">
                library.
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
            <section aria-label="Loading bookmarks" className="min-w-0">
              <FollowingPostsGridSkeleton />
            </section>
          </div>
        ) : showGate ? (
          <div className="max-w-lg space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in to see posts you have bookmarked and manage folders.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(LOGIN_NEXT)}`}
              className="inline-block border-2 border-border bg-primary px-4 py-2 font-mono text-[10px] font-black uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-transform hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="w-full min-w-0 border-[3px] border-border bg-white p-3 dark:bg-card sm:p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex min-h-0 min-w-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFilter('all')}
                      className={cn(
                        'shrink-0 rounded-none border-2 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest transition-colors transition-transform active:translate-x-0.5 active:translate-y-0.5',
                        selectedFilter === 'all'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-foreground hover:bg-muted/60',
                      )}
                    >
                      All saved
                    </button>
                    {groups.map((g) => {
                      const active = selectedFilter === g._id;
                      return (
                        <div
                          key={g._id}
                          className={cn(
                            'flex shrink-0 items-center gap-1 rounded-none border-2 px-1 py-1',
                            active ? 'border-primary bg-primary/10' : 'border-border bg-card',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedFilter(g._id)}
                            className={cn(
                              'flex max-w-[10rem] items-center gap-1.5 truncate px-2 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest transition-colors',
                              active ? 'text-primary' : 'text-foreground hover:bg-muted/50',
                            )}
                          >
                            {g.emoji ? (
                              <span className="shrink-0 text-base leading-none normal-case" aria-hidden>
                                {g.emoji}
                              </span>
                            ) : null}
                            <span className="truncate">{g.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openDefaultConfirm(g);
                            }}
                            disabled={groupsLoading || g.isDefault}
                            title={
                              g.isDefault
                                ? 'Default folder for new bookmarks'
                                : 'Make default for new bookmarks'
                            }
                            aria-label={
                              g.isDefault
                                ? 'Default folder for new bookmarks'
                                : `Make ${g.name} the default folder for new bookmarks`
                            }
                            className={cn(
                              'relative mr-1 shrink-0 rounded-full border-2 transition-colors disabled:opacity-100',
                              g.isDefault
                                ? 'pointer-events-none size-2.5 cursor-default border-purple-600 bg-purple-600 shadow-[0_0_0_2px_var(--background)]'
                                : 'size-2.5 border-muted-foreground/35 bg-transparent hover:border-purple-500 disabled:opacity-50',
                            )}
                          />
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setCreateOpen(true)}
                      className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-none border-2 border-border bg-card px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_var(--border)] hover:bg-muted/50"
                    >
                      <FolderPlus className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
                      Create folder
                    </button>
                  </div>
                </div>

                <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 lg:w-auto lg:max-w-[min(100%,22rem)] xl:max-w-[26rem]">
                  <div className="flex flex-nowrap items-stretch gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 z-[1] size-4 -translate-y-1/2 text-muted-foreground"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                      <input
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search saved titles…"
                        className="h-[42px] w-full rounded-none border-2 border-border bg-background py-2.5 pl-10 pr-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
                        autoComplete="off"
                      />
                    </div>
                    <BookmarksSortDropdown value={sortOrder} onChange={setSortOrder} />
                  </div>
                </div>
              </div>
            </div>

            <section
              aria-label="Bookmarked posts"
              className="min-w-0"
              aria-busy={postsLoading || undefined}
            >
              {postsLoading ? (
                <FollowingPostsGridSkeleton />
              ) : posts.length === 0 && (searchDebounced || selectedFilter !== 'all') ? (
                <RailFeedEmptyState
                  icon={Bookmark}
                  variant="filter"
                  title="No bookmarks match this filter"
                  description="Try another search term, switch folders, or clear the filter."
                  actions={[
                    ...(searchDebounced
                      ? [{ label: 'Clear search', onClick: () => setSearchInput('') }]
                      : []),
                    ...(selectedFilter !== 'all'
                      ? [{ label: 'All saved', onClick: () => setSelectedFilter('all') }]
                      : []),
                  ]}
                />
              ) : posts.length === 0 ? (
                <RailFeedEmptyState
                  icon={Bookmark}
                  title="No bookmarks yet"
                  description="Save posts from your feed or open a story and tap Bookmark — they will show up here in your library."
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
                <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
                  {posts.map((post) => (
                    <li key={post.id} className="flex min-h-0">
                      <BlogCard post={post} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <WarningConfirmDialog
              open={defaultConfirmOpen}
              onClose={closeDefaultConfirm}
              titleId="bookmark-default-folder-title"
              title="Are you sure you want to change the default?"
              description={
                pendingDefault
                  ? `New saves will go to “${pendingDefault.name}” unless you pick another folder when bookmarking.`
                  : undefined
              }
              confirmLabel="Make default"
              confirming={defaultConfirming}
              onConfirm={confirmSetDefault}
            />

            <Dialog
              open={createOpen}
              onClose={() => !createSubmitting && setCreateOpen(false)}
              titleId="bookmark-new-folder-title"
              title="New folder"
              description="Name it, add add new bookmark."
              titleIcon={<Bookmark strokeWidth={2.25} />}
              panelClassName="max-w-md"
              contentClassName="px-6 pb-6 pt-2"
              showCloseButton={true}
              zIndex={DIALOG_Z_INDEX_STACKED}
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bookmark-folder-name" className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Folder name
                  </label>
                  <input
                    id="bookmark-folder-name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Research"
                    maxLength={80}
                    className="w-full rounded-none border-2 border-border bg-background px-3 py-2 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bookmark-folder-emoji" className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Emoji (optional)
                  </label>
                  <input
                    id="bookmark-folder-emoji"
                    value={createEmoji}
                    onChange={(e) => setCreateEmoji(e.target.value.slice(0, 8))}
                    placeholder="📚"
                    maxLength={8}
                    className="w-full rounded-none border-2 border-border bg-background px-3 py-2 font-mono text-sm outline-none ring-primary focus-visible:ring-2"
                    autoComplete="off"
                  />
                </div>
                <label className="flex cursor-pointer items-start gap-3 border-2 border-border bg-muted/20 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={createMakeDefault}
                    onChange={(e) => setCreateMakeDefault(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span className="text-left text-xs leading-snug text-foreground">
                    <span className="font-bold">Default folder</span>
                    <span className="block text-muted-foreground">
                      New bookmarks from your feed and story pages save here unless you pick another folder.
                    </span>
                  </span>
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={createSubmitting}
                    onClick={() => setCreateOpen(false)}
                    className="border-2 border-border bg-background px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_var(--border)] transition-colors hover:bg-muted/40 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={createSubmitting || !createName.trim()}
                    onClick={() => void handleCreateGroup()}
                    className="border-2 border-border bg-primary px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-[2px_2px_0px_0px_var(--border)] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
                  >
                    {createSubmitting ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </div>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
