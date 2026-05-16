'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Heart, MessageSquare, MessageSquareReply, Pencil, Trash2 } from 'lucide-react';
import { blogApi } from '@/api/blog';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore, type AuthDialogView } from '@/store/authDialog';
import type { ParagraphPayload, PublicBlogComment } from '@/types/blog';
import { coerceParagraphDoc } from '@/types/blog';
import { formatShortRelativeTime } from '@/lib/formatShortRelativeTime';
import { cn } from '@/lib/utils';
import { RichParagraphEditor } from '@/components/ui/RichParagraphEditor';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/ui/delete';
import { BlogPostAuthor } from '@/components/blog/BlogPostAuthor';

type ThreadSort = 'oldest' | 'newest';

const COMMENT_LIKE_RAYS = 10;

function CommentLikeButton({
  comment: c,
  liked,
  likeCount,
  token,
  onToggleLike,
  openAuth,
}: Readonly<{
  comment: PublicBlogComment;
  liked: boolean;
  likeCount: number;
  token: string | null;
  onToggleLike: (comment: PublicBlogComment) => void | Promise<void>;
  openAuth: (view?: AuthDialogView) => void;
}>) {
  const [rayBurstSeq, setRayBurstSeq] = useState(0);

  return (
    <button
      type="button"
      onClick={() => {
        setRayBurstSeq((n) => n + 1);
        if (!token) {
          openAuth('login');
          return;
        }
        void onToggleLike(c);
      }}
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase',
        liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
      aria-pressed={liked}
    >
      <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
        {rayBurstSeq > 0 ? (
          <span
            key={rayBurstSeq}
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
          >
            {Array.from({ length: COMMENT_LIKE_RAYS }, (_, i) => (
              <span
                key={i}
                className="ss-comment-like-ray bg-primary"
                style={
                  {
                    '--ray-deg': `${i * (360 / COMMENT_LIKE_RAYS)}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        ) : null}
        <Heart
          className={cn(
            'relative z-[1] h-3.5 w-3.5 transition-[transform,color,fill] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            liked ? 'scale-[1.12] fill-current' : 'fill-none',
          )}
          strokeWidth={2.5}
        />
      </span>
      Like{likeCount > 0 ? ` · ${likeCount}` : ''}
    </button>
  );
}

function orderThreadComments(flat: PublicBlogComment[], sort: ThreadSort): PublicBlogComment[] {
  const byParent = new Map<string | null, PublicBlogComment[]>();
  for (const c of flat) {
    const pk: string | null = c.parentId;
    if (!byParent.has(pk)) byParent.set(pk, []);
    byParent.get(pk)!.push(c);
  }
  const cmp =
    sort === 'oldest'
      ? (a: PublicBlogComment, b: PublicBlogComment) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : (a: PublicBlogComment, b: PublicBlogComment) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  for (const arr of byParent.values()) {
    arr.sort(cmp);
  }
  const out: PublicBlogComment[] = [];
  function dfs(parentKey: string | null) {
    for (const item of byParent.get(parentKey) ?? []) {
      out.push(item);
      dfs(item._id);
    }
  }
  dfs(null);
  return out;
}

/** DFS `ordered` list → each root with its contiguous descendant slice (thread). */
function splitIntoThreads(ordered: PublicBlogComment[]): { root: PublicBlogComment; replies: PublicBlogComment[] }[] {
  const threads: { root: PublicBlogComment; replies: PublicBlogComment[] }[] = [];
  let i = 0;
  while (i < ordered.length) {
    const item = ordered[i];
    if (item.parentId != null) {
      i++;
      continue;
    }
    const root = item;
    const replies: PublicBlogComment[] = [];
    i++;
    while (i < ordered.length && ordered[i].parentId != null) {
      replies.push(ordered[i]);
      i++;
    }
    threads.push({ root, replies });
  }
  return threads;
}

function replyDepthFromRoot(
  rootId: string,
  comment: PublicBlogComment,
  byId: Map<string, PublicBlogComment>,
): number {
  let levelsBelowRoot = 0;
  let pid: string | null | undefined = comment.parentId;
  while (pid && pid !== rootId) {
    levelsBelowRoot += 1;
    pid = byId.get(pid)?.parentId ?? null;
  }
  return levelsBelowRoot + 1;
}

/** Thread root id that contains this comment id (root or any reply). */
function threadRootIdContainingComment(
  threadList: { root: PublicBlogComment; replies: PublicBlogComment[] }[],
  commentId: string,
): string | null {
  for (const t of threadList) {
    if (t.root._id === commentId) return t.root._id;
    if (t.replies.some((r) => r._id === commentId)) return t.root._id;
  }
  return null;
}

function paragraphPayloadFromCommentText(text: string): ParagraphPayload {
  const t = text.trim();
  if (t.startsWith('{') && t.includes('"type"')) {
    try {
      const parsed = JSON.parse(t) as { type?: string };
      if (parsed?.type === 'doc') return { doc: parsed, version: 'rich-text' };
    } catch {
      /* plain */
    }
  }
  return { text, version: 'plain' };
}

function collectDocText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { text?: string; content?: unknown[] };
  if (typeof n.text === 'string') return n.text;
  if (Array.isArray(n.content)) return n.content.map(collectDocText).join('');
  return '';
}

function emptyTipTapDoc() {
  return { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
}

function CommentReadBody({ text, compact }: Readonly<{ text: string; compact?: boolean }>) {
  const p = paragraphPayloadFromCommentText(text);
  const doc = p.doc ?? coerceParagraphDoc(p);
  return (
    <div className={cn('min-w-0', compact ? 'mt-1.5' : 'mt-2')}>
      <RichParagraphEditor
        initialDoc={doc}
        readOnly
        normalizeContent={false}
        className={cn(
          '!border-none !bg-transparent !p-0 !shadow-none text-sm leading-relaxed text-foreground/90 selection:bg-primary/30',
        )}
        readOnlyLinkPreview={(href) => <LinkPreviewCardContent domain={href} />}
      />
    </div>
  );
}

type CommentCardViewProps = Readonly<{
  c: PublicBlogComment;
  variant: 'root' | 'reply';
  compact: boolean;
  showTimelineDot: boolean;
  extraIndentPx: number;
  viewerId: string;
  token: string | null;
  editingId: string | null;
  editDoc: unknown | null;
  editSaving: boolean;
  startEdit: (c: PublicBlogComment) => void;
  cancelEdit: () => void;
  saveEdit: () => void | Promise<void>;
  setEditDoc: (doc: unknown) => void;
  onToggleLike: (c: PublicBlogComment) => void | Promise<void>;
  openAuth: (view?: AuthDialogView) => void;
  setReplyParentId: (id: string | null) => void;
  setDeleteTarget: (c: PublicBlogComment) => void;
  /** Root-only: inline toggle for expanding replies under this thread. */
  threadReplyCount?: number;
  threadRepliesExpanded?: boolean;
  onToggleThreadReplies?: () => void;
  /** Reply-only: parent comment author for “Reply to” badge. */
  replyParentAuthor?: { username: string; fullName?: string | null } | null;
  /** Jump to parent comment in-thread (expand thread if needed). */
  onNavigateToParentComment?: (parentCommentId: string) => void;
}>;

function CommentCardView({
  c,
  variant,
  compact,
  showTimelineDot,
  extraIndentPx,
  viewerId,
  token,
  editingId,
  editDoc,
  editSaving,
  startEdit,
  cancelEdit,
  saveEdit,
  setEditDoc,
  onToggleLike,
  openAuth,
  setReplyParentId,
  setDeleteTarget,
  threadReplyCount,
  threadRepliesExpanded,
  onToggleThreadReplies,
  replyParentAuthor,
  onNavigateToParentComment,
}: CommentCardViewProps) {
  const isOwner = Boolean(viewerId && c.authorUserId === viewerId);
  const liked = c.likedByViewer === true;
  const pad = compact ? 'p-3' : 'p-4';
  const avatarCls = compact ? 'h-8 w-8' : 'h-10 w-10';
  const metaPad = compact ? 'py-0.5' : 'py-0.5';

  const inner = (
    <div className="min-w-0">
      <div className={cn('flex flex-wrap items-start justify-between gap-x-2 gap-y-1', compact && 'gap-x-2')}>
        <BlogPostAuthor author={c.author} className="flex min-w-0 max-w-full items-start gap-2">
          <Link href={`/u/${c.author.username}`} className="shrink-0">
            <img
              src={
                c.author.profileImg ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.author.username)}`
              }
              alt=""
              className={cn(avatarCls, 'border-2 border-border object-cover')}
            />
          </Link>
          <div className="min-w-0">
            <Link
              href={`/u/${c.author.username}`}
              className="font-mono text-[11px] font-black uppercase leading-tight text-foreground hover:text-primary sm:text-xs"
            >
              {c.author.fullName || c.author.username}
            </Link>
            <span className="ml-1.5 font-mono text-[9px] text-muted-foreground sm:text-[10px]">
              @{c.author.username}
            </span>
          </div>
        </BlogPostAuthor>
        {replyParentAuthor != null ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => {
                if (c.parentId && onNavigateToParentComment) {
                  onNavigateToParentComment(c.parentId);
                }
              }}
              className="max-w-[11rem] truncate border-2 border-primary/45 bg-primary/10 px-1.5 py-0.5 text-center font-mono text-[8px] font-black uppercase leading-tight tracking-wide text-primary hover:bg-primary/18 sm:max-w-[13rem]"
              title={`Go to comment — ${replyParentAuthor.fullName?.trim() || `@${replyParentAuthor.username}`}`}
            >
              Reply to @{replyParentAuthor.username}
            </button>
            <div className="flex flex-wrap items-center justify-end gap-1">
              <span
                className={cn(
                  'shrink-0 border-2 border-border bg-background px-1.5 font-mono text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:px-2 sm:text-[10px]',
                  metaPad,
                )}
                title={new Date(c.createdAt).toLocaleString()}
              >
                {formatShortRelativeTime(c.createdAt)}
              </span>
              {c.editedAt ? (
                <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-wide text-primary/90 sm:text-[9px]">
                  · edited
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <span
              className={cn(
                'shrink-0 border-2 border-border bg-background px-1.5 font-mono text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:px-2 sm:text-[10px]',
                metaPad,
              )}
              title={new Date(c.createdAt).toLocaleString()}
            >
              {formatShortRelativeTime(c.createdAt)}
            </span>
            {c.editedAt ? (
              <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-wide text-primary/90 sm:text-[9px]">
                · edited
              </span>
            ) : null}
          </>
        )}
      </div>

      {editingId === c._id && editDoc != null ? (
        <div className={cn('space-y-2', compact ? 'mt-1.5' : 'mt-2')}>
          <RichParagraphEditor
            key={`edit-${c._id}`}
            initialDoc={editDoc}
            onChange={setEditDoc}
            editorPlaceholder="Edit comment…"
            className={cn(
              'min-h-[4rem] border-2 border-border bg-card p-0 font-mono text-sm',
              'focus-within:border-primary',
              compact && 'min-h-[3.5rem] text-[13px]',
            )}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={editSaving}
              className="border-2 border-border bg-card px-2.5 py-1 font-mono text-[10px] font-bold uppercase shadow-[2px_2px_0_0_var(--border)] hover:bg-muted/60 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={
                editSaving ||
                collectDocText(editDoc).trim().length === 0 ||
                JSON.stringify(editDoc).length > 50_000
              }
              className="border-2 border-border bg-primary px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-primary-foreground shadow-[2px_2px_0_0_var(--border)] disabled:opacity-50 hover:brightness-110"
            >
              {editSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <CommentReadBody text={c.text} compact={compact} />
      )}

      {editingId !== c._id ? (
        <div className={cn('flex flex-wrap items-center justify-end gap-x-3 gap-y-1', compact ? 'mt-1.5' : 'mt-2')}>
          <button
            type="button"
            onClick={() => {
              if (!token) {
                openAuth('login');
                return;
              }
              setReplyParentId(c._id);
              document.getElementById('blog-comment-composer-anchor')?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }}
            className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
          >
            <MessageSquareReply className="h-3.5 w-3.5" strokeWidth={2.5} />
            Reply
          </button>
          {variant === 'root' &&
          threadReplyCount != null &&
          threadReplyCount > 0 &&
          onToggleThreadReplies ? (
            <button
              type="button"
              aria-expanded={threadRepliesExpanded === true}
              onClick={() => {
                onToggleThreadReplies();
              }}
              className={cn(
                'inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground',
                threadRepliesExpanded && 'text-primary',
              )}
            >
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                  threadRepliesExpanded && 'rotate-180',
                )}
                strokeWidth={2.5}
                aria-hidden
              />
              {threadRepliesExpanded ? 'Hide' : 'View'} replies
              <span className="tabular-nums text-muted-foreground">({threadReplyCount})</span>
            </button>
          ) : null}
          <CommentLikeButton
            comment={c}
            liked={liked}
            likeCount={c.likeCount}
            token={token}
            onToggleLike={onToggleLike}
            openAuth={openAuth}
          />
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => startEdit(c)}
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(c)}
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-destructive hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                Delete
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (variant === 'reply') {
    return (
      <article
        id={`blog-comment-${c._id}`}
        className="flex scroll-mt-28 gap-2"
        style={{ marginLeft: extraIndentPx }}
      >
        {showTimelineDot ? (
          <div className="relative flex w-5 shrink-0 items-center justify-center self-stretch" aria-hidden>
            <span className="absolute top-1/2 left-1/2 z-[1] size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-border bg-primary ring-2 ring-card" />
          </div>
        ) : (
          <div className="w-5 shrink-0" aria-hidden />
        )}
        <div
          className={cn(
            'min-w-0 flex-1 border-2 border-border bg-card',
            pad,
            'bg-muted/5',
          )}
        >
          {inner}
        </div>
      </article>
    );
  }

  return (
    <article id={`blog-comment-${c._id}`} className={cn('scroll-mt-28 border-2 border-border bg-card', pad)}>
      {inner}
    </article>
  );
}

export function BlogCommentsSection({
  username,
  slug,
  hideTitle = false,
  onCommentStatsChange,
}: Readonly<{
  username: string;
  slug: string;
  /** When true, show `Signal_Channel` heading with sort + count on the right (blog post page). */
  hideTitle?: boolean;
  /** Total + loading for bottom dock badge / chrome. */
  onCommentStatsChange?: (stats: { total: number; loading: boolean }) => void;
}>) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [comments, setComments] = useState<PublicBlogComment[]>([]);
  const [commentTotal, setCommentTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [draftDoc, setDraftDoc] = useState<unknown>(() => emptyTipTapDoc());
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDoc, setEditDoc] = useState<unknown | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [threadSort, setThreadSort] = useState<ThreadSort>('oldest');
  const [deleteTarget, setDeleteTarget] = useState<PublicBlogComment | null>(null);
  const [deleteWorking, setDeleteWorking] = useState(false);

  const viewerId = user?.id ?? user?._id ?? '';

  const ordered = useMemo(() => orderThreadComments(comments, threadSort), [comments, threadSort]);
  const commentById = useMemo(() => new Map(comments.map((x) => [x._id, x])), [comments]);
  const threads = useMemo(() => splitIntoThreads(ordered), [ordered]);
  const [expandedReplyRootId, setExpandedReplyRootId] = useState<string | null>(null);
  const freshEmptyDoc = useMemo(() => emptyTipTapDoc(), [formKey]);

  const viewerAvatar =
    user?.profileImg ||
    (user?.username
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`
      : null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { comments: list, total } = await blogApi.getComments(username, slug, 80, token);
      setComments(list);
      setCommentTotal(total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load comments', {
        id: 'syntax-blog-comments-load',
      });
    } finally {
      setLoading(false);
    }
  }, [username, slug, token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onCommentStatsChange?.({ total: commentTotal, loading });
  }, [commentTotal, loading, onCommentStatsChange]);

  const draftPlain = collectDocText(draftDoc).trim();
  const draftSerialized = JSON.stringify(draftDoc ?? emptyTipTapDoc());
  const canSubmitNew = draftPlain.length > 0 && draftSerialized.length <= 50_000;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canSubmitNew) return;
    setSubmitting(true);
    try {
      const { comment } = await blogApi.postComment(
        username,
        slug,
        draftSerialized,
        token,
        replyParentId ?? undefined,
      );
      setComments((prev) => orderThreadComments([...prev, comment], threadSort));
      setCommentTotal((t) => t + 1);
      setReplyParentId(null);
      setFormKey((k) => k + 1);
      setDraftDoc(emptyTipTapDoc());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post comment', {
        id: 'syntax-blog-comments-post',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const replyLabel = useMemo(() => {
    if (!replyParentId) return null;
    const target = comments.find((c) => c._id === replyParentId);
    if (!target) return null;
    return target.author.username;
  }, [replyParentId, comments]);

  const canPost = Boolean(isHydrated && token);

  const onToggleLike = async (c: PublicBlogComment) => {
    if (!token) {
      openAuth('login');
      return;
    }
    const was = c.likedByViewer === true;
    const prevCount = c.likeCount;
    setComments((list) =>
      list.map((x) =>
        x._id !== c._id
          ? x
          : {
              ...x,
              likedByViewer: !was,
              likeCount: Math.max(0, prevCount + (was ? -1 : 1)),
            },
      ),
    );
    try {
      const r = await blogApi.toggleCommentLike(username, slug, c._id, token);
      setComments((list) =>
        list.map((x) =>
          x._id !== c._id
            ? x
            : {
                ...x,
                likeCount: r.likeCount,
                likedByViewer: r.likedByViewer,
              },
        ),
      );
    } catch {
      setComments((list) =>
        list.map((x) => (x._id !== c._id ? x : { ...x, likedByViewer: was, likeCount: prevCount })),
      );
      toast.error('Could not update like', { id: 'syntax-blog-comments-like' });
    }
  };

  const startEdit = (c: PublicBlogComment) => {
    const p = paragraphPayloadFromCommentText(c.text);
    const doc = p.doc ?? coerceParagraphDoc(p);
    setEditingId(c._id);
    setEditDoc(doc);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDoc(null);
  };

  const toggleThreadReplies = useCallback((rootId: string) => {
    setExpandedReplyRootId((prev) => (prev === rootId ? null : rootId));
  }, []);

  const navigateToParentComment = useCallback(
    (parentCommentId: string) => {
      const threadRootId = threadRootIdContainingComment(threads, parentCommentId);
      if (!threadRootId) return;

      const parentIsThreadRoot = threads.some((t) => t.root._id === parentCommentId);
      const needsExpandReplies = !parentIsThreadRoot && expandedReplyRootId !== threadRootId;

      if (needsExpandReplies) {
        setExpandedReplyRootId(threadRootId);
      }

      const delay = needsExpandReplies ? 340 : 0;

      window.setTimeout(() => {
        const el = document.getElementById(`blog-comment-${parentCommentId}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background', 'rounded-sm');
        window.setTimeout(() => {
          el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background', 'rounded-sm');
        }, 1800);
      }, delay);
    },
    [threads, expandedReplyRootId],
  );

  const saveEdit = async () => {
    if (!token || !editingId || editDoc == null) return;
    const serialized = JSON.stringify(editDoc);
    if (collectDocText(editDoc).trim().length === 0 || serialized.length > 50_000) return;
    setEditSaving(true);
    try {
      const { comment } = await blogApi.patchComment(username, slug, editingId, serialized, token);
      setComments((prev) => prev.map((x) => (x._id === comment._id ? comment : x)));
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save comment', {
        id: 'syntax-blog-comments-patch',
      });
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDeleteComment = async () => {
    if (!deleteTarget || !token) return;
    setDeleteWorking(true);
    try {
      await blogApi.deleteComment(username, slug, deleteTarget._id, token);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete comment', {
        id: 'syntax-blog-comments-delete',
      });
    } finally {
      setDeleteWorking(false);
    }
  };

  const shellClass = cn(!hideTitle && 'mt-12 border-t-4 border-border pt-8');

  const sortControl = (
    <label className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      <span className="text-foreground">Sort</span>
      <span className="relative inline-flex items-center">
        <select
          value={threadSort}
          onChange={(e) => setThreadSort(e.target.value as ThreadSort)}
          className={cn(
            'appearance-none rounded border-2 border-border bg-card py-1.5 pl-2 pr-8 font-mono text-[10px] font-bold uppercase',
            'text-foreground shadow-[2px_2px_0_0_var(--border)] cursor-pointer hover:bg-muted/40',
            'focus:border-primary focus:outline-none',
          )}
        >
          <option value="oldest">Oldest first</option>
          <option value="newest">Newest first</option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </span>
    </label>
  );

  const countBadge = (
    <span
      className={cn(
        'flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card px-2',
        'font-mono text-xs font-black tabular-nums text-foreground shadow-[2px_2px_0_0_var(--border)]',
      )}
      title={loading ? 'Loading count…' : `${commentTotal} comments`}
      aria-label={loading ? 'Comment count loading' : `${commentTotal} comments`}
    >
      {loading ? '…' : commentTotal > 99 ? '99+' : commentTotal}
    </span>
  );

  const composerCompactBottom = !loading && comments.length === 0;

  const composer = (
    <div
      id="blog-comment-composer-anchor"
      className={cn('scroll-mt-28', composerCompactBottom ? 'mb-3' : 'mb-8')}
    >
      {isHydrated && canPost ? (
        <form onSubmit={onSubmit} className="space-y-3">
          {replyParentId && replyLabel ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-dashed border-border bg-muted/30 px-3 py-2 font-mono text-[10px] text-muted-foreground">
              <span>
                Replying to <span className="font-bold text-foreground">@{replyLabel}</span>
              </span>
              <button
                type="button"
                onClick={() => setReplyParentId(null)}
                className="font-bold uppercase text-foreground underline-offset-2 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : null}
          <div className="flex items-start gap-3">
            <div className="shrink-0 pt-1">
              {viewerAvatar ? (
                <img
                  src={viewerAvatar}
                  alt=""
                  className="h-10 w-10 border-2 border-border object-cover"
                />
              ) : (
                <div className="h-10 w-10 border-2 border-dashed border-border bg-muted/40" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <label htmlFor={`blog-comment-editor-${formKey}`} className="sr-only">
                Share your thoughts
              </label>
              <div
                className={cn(
                  'border-2 border-border bg-card p-3 font-mono text-sm shadow-[3px_3px_0_0_var(--border)]',
                  'focus-within:border-primary focus-within:shadow-[4px_4px_0_0_var(--border)]',
                )}
              >
                <RichParagraphEditor
                  key={formKey}
                  initialDoc={freshEmptyDoc}
                  onChange={setDraftDoc}
                  editorPlaceholder="Share your thoughts…"
                  className="min-h-[4.5rem] border-0 bg-transparent p-0 font-mono text-sm shadow-none focus-within:ring-0"
                />
              </div>
              {draftSerialized.length > 50_000 ? (
                <p className="font-mono text-[10px] text-destructive">Comment is too long.</p>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={submitting || !canSubmitNew}
                  className="border-2 border-border bg-primary px-5 py-2 font-mono text-xs font-black uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--border)] hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : isHydrated ? (
        <button
          type="button"
          onClick={() => openAuth('login')}
          className="border-2 border-border bg-card px-4 py-2 font-mono text-xs font-bold uppercase shadow-[3px_3px_0_0_var(--border)] hover:bg-muted/60"
        >
          Sign in to comment
        </button>
      ) : null}
    </div>
  );

  const body = (
    <>
      {hideTitle ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h2
            id="blog-comments-heading"
            className="flex min-w-0 items-center gap-2 font-mono text-sm font-black uppercase tracking-wider text-foreground"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
            <span>Signal_Channel</span>
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {sortControl}
            {countBadge}
          </div>
        </div>
      ) : (
        <>
          <h2
            id="blog-comments-heading"
            className="mb-4 flex items-center gap-2 font-mono text-sm font-black uppercase tracking-wider text-foreground"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
            Comments
          </h2>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {sortControl}
            {countBadge}
          </div>
        </>
      )}

      {composer}

      {loading && <p className="font-mono text-xs text-muted-foreground">Loading comments…</p>}

      {!loading && comments.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-2 text-center"
          role="status"
        >
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary dark:bg-primary/20"
            aria-hidden
          >
            <MessageSquare className="size-5" strokeWidth={2.25} />
          </div>
          <p className="m-0 max-w-sm font-mono text-xs leading-relaxed text-muted-foreground">
            No comments yet — start the thread.
          </p>
        </div>
      ) : null}

      {!loading && threads.length > 0 ? (
        <ul className="space-y-3">
          {threads.map(({ root, replies }) => {
            const open = expandedReplyRootId === root._id;
            const n = replies.length;
            return (
              <li key={root._id} className="space-y-2">
                <CommentCardView
                  c={root}
                  variant="root"
                  compact
                  showTimelineDot={false}
                  extraIndentPx={0}
                  viewerId={viewerId}
                  token={token}
                  editingId={editingId}
                  editDoc={editDoc}
                  editSaving={editSaving}
                  startEdit={startEdit}
                  cancelEdit={cancelEdit}
                  saveEdit={saveEdit}
                  setEditDoc={setEditDoc}
                  onToggleLike={onToggleLike}
                  openAuth={openAuth}
                  setReplyParentId={setReplyParentId}
                  setDeleteTarget={setDeleteTarget}
                  threadReplyCount={n}
                  threadRepliesExpanded={open}
                  onToggleThreadReplies={() => toggleThreadReplies(root._id)}
                />

                {n > 0 ? (
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        key={`thread-${root._id}-replies`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <ul className="space-y-2 pt-1">
                          {replies.map((reply, idx) => {
                            const depth = replyDepthFromRoot(root._id, reply, commentById);
                            const indent = Math.min(Math.max(depth - 1, 0), 4) * 8;
                            const parentComment = reply.parentId ? commentById.get(reply.parentId) : undefined;
                            const replyParentAuthor = parentComment
                              ? {
                                  username: parentComment.author.username,
                                  fullName: parentComment.author.fullName,
                                }
                              : null;
                            return (
                              <motion.li
                                key={reply._id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.18, delay: idx * 0.035 }}
                              >
                                <CommentCardView
                                  c={reply}
                                  variant="reply"
                                  compact
                                  showTimelineDot
                                  extraIndentPx={indent}
                                  replyParentAuthor={replyParentAuthor}
                                  onNavigateToParentComment={navigateToParentComment}
                                  viewerId={viewerId}
                                  token={token}
                                  editingId={editingId}
                                  editDoc={editDoc}
                                  editSaving={editSaving}
                                  startEdit={startEdit}
                                  cancelEdit={cancelEdit}
                                  saveEdit={saveEdit}
                                  setEditDoc={setEditDoc}
                                  onToggleLike={onToggleLike}
                                  openAuth={openAuth}
                                  setReplyParentId={setReplyParentId}
                                  setDeleteTarget={setDeleteTarget}
                                />
                              </motion.li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleteWorking) setDeleteTarget(null);
        }}
        titleId="blog-comment-delete-dialog-title"
        title="Delete comment"
        description="This removes the comment and all replies under it. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteComment}
        confirming={deleteWorking}
      />
    </>
  );

  if (hideTitle) {
    return body;
  }

  return (
    <section className={shellClass} aria-label="Comments">
      {body}
    </section>
  );
}
