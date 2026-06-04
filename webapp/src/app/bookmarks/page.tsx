'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Compass, FolderPlus, Search } from 'lucide-react';
import { RetroSortDropdown } from '@/components/ui/retro';
import { toast } from 'sonner';
import { bookmarksApi, type BookmarkGroupRow } from '@/api/bookmarks';
import { BlogCard } from '@/features/blog';
import { RailFeedEmptyState, ShellPageIntroHeader, SignInRequiredPanel } from '@/components/layout';
import { FollowingPostsGridSkeleton, FollowingToolbarSkeleton } from '@/components/skeletons';
import {
  BookmarkFolderChip,
} from '@/components/bookmarks/BookmarkFolderChip';
import {
  BookmarkFolderFormDialog,
  type BookmarkFolderFormValues,
} from '@/components/bookmarks/BookmarkFolderFormDialog';
import { ConfirmDialog } from '@/components/ui/dialog';
import { BlogApiConnectionError } from '@/lib/api/blogAuthFetch';
import { mapPublicFeedPostToPost } from '@/lib/blog/mapFeedPostToPost';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/core/utils';
import type { Post } from '@/types';

const BOOKMARK_SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Newest saved', shortLabel: 'Newest' },
  { value: 'oldest' as const, label: 'Oldest saved', shortLabel: 'Oldest' },
];

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

  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogMode, setFolderDialogMode] = useState<'create' | 'edit'>('create');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [folderForm, setFolderForm] = useState<BookmarkFolderFormValues>({
    name: '',
    emoji: '',
    makeDefault: false,
  });
  const [folderSubmitting, setFolderSubmitting] = useState(false);

  const [defaultConfirmOpen, setDefaultConfirmOpen] = useState(false);
  const [pendingDefault, setPendingDefault] = useState<{ id: string; name: string } | null>(null);
  const [defaultConfirming, setDefaultConfirming] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<BookmarkGroupRow | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

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

  const openCreateFolder = useCallback(() => {
    setFolderDialogMode('create');
    setEditingGroupId(null);
    setFolderForm({ name: '', emoji: '', makeDefault: false });
    setFolderDialogOpen(true);
  }, []);

  const openEditFolder = useCallback((g: BookmarkGroupRow) => {
    setFolderDialogMode('edit');
    setEditingGroupId(g._id);
    setFolderForm({
      name: g.name,
      emoji: g.emoji ?? '',
      makeDefault: false,
    });
    setFolderDialogOpen(true);
  }, []);

  const closeFolderDialog = useCallback(() => {
    if (folderSubmitting) return;
    setFolderDialogOpen(false);
    setEditingGroupId(null);
  }, [folderSubmitting]);

  const handleFolderFormSubmit = useCallback(async () => {
    if (!token || !folderForm.name.trim()) return;
    setFolderSubmitting(true);
    try {
      if (folderDialogMode === 'create') {
        await bookmarksApi.createGroup(folderForm.name.trim(), token, {
          emoji: folderForm.emoji || undefined,
          makeDefault: folderForm.makeDefault,
        });
        toast.success('Folder created');
      } else if (editingGroupId) {
        await bookmarksApi.updateGroup(editingGroupId, token, {
          name: folderForm.name.trim(),
          emoji: folderForm.emoji,
        });
        toast.success('Folder updated');
      }
      setFolderDialogOpen(false);
      setEditingGroupId(null);
      setFolderForm({ name: '', emoji: '', makeDefault: false });
      await loadGroups();
    } catch (e) {
      toastApiError(
        e,
        folderDialogMode === 'create' ? 'Could not create folder' : 'Could not update folder'
      );
    } finally {
      setFolderSubmitting(false);
    }
  }, [token, folderForm, folderDialogMode, editingGroupId, loadGroups]);

  const openDeleteConfirm = useCallback((g: BookmarkGroupRow) => {
    if (g.isDefault) return;
    setPendingDelete(g);
    setDeleteConfirmOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    if (deleteConfirming) return;
    setDeleteConfirmOpen(false);
    setPendingDelete(null);
  }, [deleteConfirming]);

  const confirmDeleteFolder = useCallback(async () => {
    if (!token || !pendingDelete) return;
    setDeleteConfirming(true);
    try {
      await bookmarksApi.deleteGroup(pendingDelete._id, token);
      if (selectedFilter === pendingDelete._id) setSelectedFilter('all');
      setDeleteConfirmOpen(false);
      setPendingDelete(null);
      await loadGroups();
      await loadPosts();
      toast.success('Folder deleted');
    } catch (e) {
      toastApiError(e, 'Could not delete folder');
    } finally {
      setDeleteConfirming(false);
    }
  }, [token, pendingDelete, selectedFilter, loadGroups, loadPosts]);

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
    !isHydrated || (Boolean(token && user) && !initialLoadDone && (groupsLoading || postsLoading));

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
          <SignInRequiredPanel
            icon={Bookmark}
            description="Sign in to see posts you have bookmarked and manage folders."
          />
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
                        'shrink-0  border-2 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest transition-colors transition-transform active:translate-x-0.5 active:translate-y-0.5',
                        selectedFilter === 'all'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-foreground hover:bg-muted/60'
                      )}
                    >
                      All saved
                    </button>
                    {groups.map((g) => (
                      <BookmarkFolderChip
                        key={g._id}
                        group={g}
                        active={selectedFilter === g._id}
                        groupsLoading={groupsLoading}
                        onSelect={() => setSelectedFilter(g._id)}
                        onMakeDefault={() => openDefaultConfirm(g)}
                        onEdit={() => openEditFolder(g)}
                        onDelete={() => openDeleteConfirm(g)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={openCreateFolder}
                      className="ml-auto inline-flex shrink-0 items-center gap-2 border-2 border-border bg-card px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest shadow hover:bg-muted/50"
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
                        className="h-[42px] w-full border-2 border-border bg-background py-2.5 pl-10 pr-3 font-mono text-xs outline-none ring-primary focus-visible:ring-2"
                        autoComplete="off"
                      />
                    </div>
                    <RetroSortDropdown
                      value={sortOrder}
                      onChange={setSortOrder}
                      options={BOOKMARK_SORT_OPTIONS}
                      ariaLabelPrefix="Sort bookmarks"
                    />
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

            <ConfirmDialog
              open={defaultConfirmOpen}
              onClose={closeDefaultConfirm}
              titleId="bookmark-default-folder-title"
              title="Are you sure you want to change the default?"
              variant="warning"
              message={
                pendingDefault
                  ? `New saves will go to “${pendingDefault.name}” unless you pick another folder when bookmarking.`
                  : undefined
              }
              confirmLabel="Make default"
              closeOnConfirm={false}
              loading={defaultConfirming}
              onConfirm={confirmSetDefault}
            />

            <ConfirmDialog
              open={deleteConfirmOpen}
              onClose={closeDeleteConfirm}
              titleId="bookmark-delete-folder-title"
              title="Delete this folder?"
              variant="danger"
              message={
                pendingDelete
                  ? `“${pendingDelete.name}” will be removed. Saved posts in this folder move to your default folder.`
                  : undefined
              }
              confirmLabel="Delete folder"
              closeOnConfirm={false}
              loading={deleteConfirming}
              onConfirm={confirmDeleteFolder}
            />

            <BookmarkFolderFormDialog
              open={folderDialogOpen}
              mode={folderDialogMode}
              submitting={folderSubmitting}
              values={folderForm}
              onClose={closeFolderDialog}
              onChange={(patch) => setFolderForm((prev) => ({ ...prev, ...patch }))}
              onSubmit={() => void handleFolderFormSubmit()}
              showMakeDefault={folderDialogMode === 'create'}
            />
          </>
        )}
      </div>
    </div>
  );
}
