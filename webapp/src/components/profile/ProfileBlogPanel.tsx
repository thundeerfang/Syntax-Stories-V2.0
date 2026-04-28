'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Pencil, Trash2, Globe, NotebookPen, ArchiveRestore, Skull } from 'lucide-react';
import { toast } from 'sonner';
import { blogApi, type BlogPostResponse } from '@/api/blog';
import { BlogCard } from '@/components/blog/BlogCard';
import {
  BlogPostDeleteDialog,
  BlogPostEditNavigationDialog,
  BlogPostPurgePermanentDialog,
} from '@/components/blog/BlogPostActionDialogs';
import { blockShadowButtonClassNames } from '@/components/ui/BlockShadowButton';
import { mapBlogPostResponseToPost } from '@/lib/mapBlogPostResponseToPost';
import { setWriteEditorSessionPostId } from '@/lib/writeBlogSession';
import { cn } from '@/lib/utils';

const TRASH_MS = 7 * 24 * 60 * 60 * 1000;

function formatBlogDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function trashExpiresLabel(deletedAt?: string): string {
  if (!deletedAt) return '';
  const end = new Date(deletedAt).getTime() + TRASH_MS;
  const left = end - Date.now();
  if (left <= 0) return 'Expired from trash — refresh the list.';
  const days = Math.ceil(left / (24 * 60 * 60 * 1000));
  return days <= 1 ? 'Purges within 1 day' : `Purges in ~${days} days`;
}

type BlogManageTab = 'published' | 'drafts' | 'deleted';

export function ProfileBlogPanel({
  token,
  username,
  authorDisplayName,
  authorProfileImg,
}: Readonly<{
  token: string | null;
  username: string;
  authorDisplayName: string;
  authorProfileImg?: string;
}>) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<BlogManageTab>('published');
  const [published, setPublished] = useState<BlogPostResponse[]>([]);
  const [drafts, setDrafts] = useState<BlogPostResponse[]>([]);
  const [deleted, setDeleted] = useState<BlogPostResponse[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<BlogPostResponse | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<BlogPostResponse | null>(null);
  const [purgeSubmitting, setPurgeSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<BlogPostResponse | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setPublished([]);
      setDrafts([]);
      setDeleted([]);
      return;
    }
    setLoading(true);
    try {
      const [pub, dr, del] = await Promise.all([
        blogApi.listMyPosts(token, 'published'),
        blogApi.listMyPosts(token, 'draft'),
        blogApi.listMyPosts(token, 'deleted'),
      ]);
      const pubPosts = (pub.posts ?? []).filter((p) => p.status === 'published');
      setPublished(pubPosts);
      setDrafts(dr.posts ?? []);
      setDeleted(del.posts ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load blogs');
      setPublished([]);
      setDrafts([]);
      setDeleted([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = useCallback(
    async (p: BlogPostResponse) => {
      if (!token) return;
      setDeleteSubmitting(true);
      try {
        await blogApi.deletePost(p._id, token);
        toast.success('Post moved to trash');
        setDeleteTarget(null);
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Delete failed');
      } finally {
        setDeleteSubmitting(false);
      }
    },
    [token, load],
  );

  const confirmPurge = useCallback(
    async (p: BlogPostResponse) => {
      if (!token) return;
      setPurgeSubmitting(true);
      try {
        await blogApi.purgePostPermanent(p._id, token);
        toast.success('Post permanently deleted');
        setPurgeTarget(null);
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Permanent delete failed');
      } finally {
        setPurgeSubmitting(false);
      }
    },
    [token, load],
  );

  const restore = useCallback(
    async (p: BlogPostResponse) => {
      if (!token) return;
      setRestoreId(p._id);
      try {
        const { post: restored } = await blogApi.restorePost(p._id, token);
        toast.success('Restored as published', {
          description: restored.slug !== p.slug ? `New URL slug: ${restored.slug}` : undefined,
        });
        await load();
        setTab('published');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Restore failed');
      } finally {
        setRestoreId(null);
      }
    },
    [token, load],
  );

  const goToEditor = useCallback(
    (p: BlogPostResponse) => {
      setWriteEditorSessionPostId(p._id);
      setEditTarget(null);
      router.push('/blogs/write');
    },
    [router],
  );

  const publicHref = (slug: string) => `/blogs/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;

  const author = useMemo(
    () => ({
      username,
      displayName: authorDisplayName || username,
      profileImg: authorProfileImg,
    }),
    [username, authorDisplayName, authorProfileImg],
  );

  if (!token) return null;

  return (
    <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em]">
          <FileText className="size-4 text-primary" /> Blog
        </h2>
        <Link
          href="/blogs/write"
          onClick={() => setWriteEditorSessionPostId(null)}
          className={cn(
            blockShadowButtonClassNames({ variant: 'primary', size: 'sm', shadow: 'sm' }),
            'no-underline',
          )}
        >
          <NotebookPen className="size-3.5" /> Write
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 border-b-2 border-border pb-2">
        {(
          [
            { id: 'published' as const, label: 'Published', icon: Globe },
            { id: 'drafts' as const, label: 'Drafts', icon: NotebookPen },
            { id: 'deleted' as const, label: 'Deleted', icon: Trash2 },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex items-center gap-1.5 border-2 border-border px-3 py-2 font-mono text-[9px] font-black uppercase tracking-widest transition-all',
              tab === id
                ? 'border-primary bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--border)]'
                : 'bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="font-mono text-[10px] uppercase tracking-widest">Loading…</span>
        </div>
      ) : tab === 'published' ? (
        published.length === 0 ? (
          <p className="border-2 border-dashed border-border bg-muted/20 py-6 text-center text-[10px] text-muted-foreground">
            No published posts yet.
          </p>
        ) : (
          <ul className="grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-2">
            {published.map((p) => (
              <li
                key={p._id}
                className="group/card relative list-none overflow-hidden border-2 border-border bg-card shadow-[6px_6px_0_0_var(--border)]"
              >
                <BlogCard
                  post={mapBlogPostResponseToPost(p, author)}
                  showSocialActions={false}
                  viewerUsername={username}
                  density="compact"
                  className="relative z-0 border-0 shadow-none"
                />
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 z-10 flex flex-col justify-end opacity-0 transition-opacity duration-200',
                    'group-hover/card:pointer-events-auto group-hover/card:opacity-100',
                    'group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100',
                  )}
                >
                  <div className="min-h-0 flex-1 bg-black/60" aria-hidden />
                  <div className="flex border-t border-white/10 bg-black/85 font-mono text-[9px] font-black uppercase tracking-wide text-primary-foreground">
                    <Link
                      href={publicHref(p.slug)}
                      className="flex flex-1 items-center justify-center gap-1 py-3 hover:bg-white/10"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditTarget(p)}
                      className="flex flex-1 items-center justify-center gap-1 border-x border-white/10 py-3 hover:bg-white/10"
                    >
                      <Pencil className="size-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      className="flex flex-1 items-center justify-center gap-1 py-3 text-red-200 hover:bg-red-500/20"
                      aria-label="Move post to trash"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : tab === 'drafts' ? (
        drafts.length === 0 ? (
          <p className="border-2 border-dashed border-border bg-muted/20 py-6 text-center text-[10px] text-muted-foreground">
            No drafts. Autosave keeps your work in the database when you write.
          </p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((p) => (
              <li
                key={p._id}
                className="flex flex-wrap items-center justify-between gap-2 border-2 border-dashed border-border bg-muted/10 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-bold text-foreground">{p.title}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{formatBlogDate(p.updatedAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditTarget(p)}
                    className="inline-flex items-center gap-1 border border-border bg-card px-2 py-1 font-mono text-[9px] font-bold uppercase hover:bg-muted"
                  >
                    <Pencil className="size-3" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    className="inline-flex items-center gap-1 border border-destructive/50 px-2 py-1 font-mono text-[9px] font-bold uppercase text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : deleted.length === 0 ? (
        <p className="border-2 border-dashed border-border bg-muted/20 py-6 text-center text-[10px] text-muted-foreground">
          Trash is empty. Deleted posts stay here for 7 days before they expire from restore.
        </p>
      ) : (
        <ul className="space-y-3">
          {deleted.map((p) => (
            <li
              key={p._id}
              className="flex flex-col gap-2 border-2 border-border bg-muted/15 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-bold text-foreground">{p.title}</p>
                <p className="font-mono text-[9px] text-muted-foreground">
                  Deleted {p.deletedAt ? formatBlogDate(p.deletedAt) : '—'} · {trashExpiresLabel(p.deletedAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={restoreId === p._id}
                  onClick={() => void restore(p)}
                  className="inline-flex items-center gap-1 border-2 border-border bg-card px-2 py-1.5 font-mono text-[9px] font-bold uppercase shadow-[2px_2px_0_0_var(--border)] hover:bg-muted disabled:opacity-50"
                >
                  <ArchiveRestore className="size-3.5" />
                  {restoreId === p._id ? '…' : 'Restore'}
                </button>
                <button
                  type="button"
                  onClick={() => setPurgeTarget(p)}
                  className="inline-flex items-center gap-1 border-2 border-destructive/60 bg-destructive/10 px-2 py-1.5 font-mono text-[9px] font-bold uppercase text-destructive hover:bg-destructive/20"
                >
                  <Skull className="size-3.5" />
                  Delete forever
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BlogPostDeleteDialog
        post={deleteTarget}
        open={deleteTarget !== null}
        loading={deleteSubmitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(post) => void confirmDelete(post)}
      />
      <BlogPostPurgePermanentDialog
        post={purgeTarget}
        open={purgeTarget !== null}
        loading={purgeSubmitting}
        onClose={() => setPurgeTarget(null)}
        onConfirm={(post) => void confirmPurge(post)}
      />
      <BlogPostEditNavigationDialog
        post={editTarget}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onConfirm={(post) => goToEditor(post)}
      />
    </section>
  );
}
