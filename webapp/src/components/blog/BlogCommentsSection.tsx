'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { blogApi } from '@/api/blog';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import type { PublicBlogComment } from '@/types/blog';
import { cn } from '@/lib/utils';

export function BlogCommentsSection({
  username,
  slug,
}: Readonly<{
  username: string;
  slug: string;
}>) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [comments, setComments] = useState<PublicBlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { comments: list } = await blogApi.getComments(username, slug);
      setComments(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [username, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      const { comment } = await blogApi.postComment(username, slug, text, token);
      setComments((prev) => [...prev, comment]);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const canPost = Boolean(isHydrated && token);

  return (
    <section
      className="mt-12 border-t-4 border-border pt-8"
      aria-labelledby="blog-comments-heading"
    >
      <h2 id="blog-comments-heading" className="font-mono text-sm font-black uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" strokeWidth={2.5} />
        Comments
      </h2>

      {loading && <p className="font-mono text-xs text-muted-foreground">Loading comments…</p>}
      {error && <p className="font-mono text-xs text-destructive mb-3">{error}</p>}

      <ul className="space-y-4 mb-6">
        {!loading &&
          comments.map((c) => (
            <li
              key={c._id}
              className="border-2 border-border bg-muted/20 p-4 shadow-[3px_3px_0_0_var(--border)]"
            >
              <div className="flex items-start gap-3">
                <Link href={`/u/${c.author.username}`} className="shrink-0">
                  <img
                    src={c.author.profileImg || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.author.username)}`}
                    alt=""
                    className="h-10 w-10 border-2 border-border object-cover"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <Link
                      href={`/u/${c.author.username}`}
                      className="font-mono text-xs font-black uppercase text-foreground hover:text-primary"
                    >
                      {c.author.fullName || c.author.username}
                    </Link>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      @{c.author.username}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      · {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground whitespace-pre-wrap break-words">{c.text}</p>
                </div>
              </div>
            </li>
          ))}
      </ul>

      {!loading && comments.length === 0 && !error && (
        <p className="font-mono text-xs text-muted-foreground mb-4">No comments yet — start the thread.</p>
      )}

      {isHydrated && canPost ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <label htmlFor="blog-comment-input" className="sr-only">
            Write a comment
          </label>
          <textarea
            id="blog-comment-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Write a comment…"
            className={cn(
              'w-full resize-y border-2 border-border bg-background p-3 font-mono text-sm',
              'placeholder:text-muted-foreground focus:border-primary focus:outline-none',
            )}
          />
          <button
            type="submit"
            disabled={submitting || !draft.trim()}
            className="border-2 border-border bg-primary px-4 py-2 font-mono text-xs font-bold uppercase text-primary-foreground shadow-[3px_3px_0_0_var(--border)] disabled:opacity-50 hover:brightness-110"
          >
            {submitting ? 'Posting…' : 'Post comment'}
          </button>
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
    </section>
  );
}
