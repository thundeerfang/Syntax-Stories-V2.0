'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, WifiOff } from 'lucide-react';
import { blogApi } from '@/api/blog';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogApiConnectionError } from '@/lib/blogAuthFetch';
import { mapPublicFeedPostToPost } from '@/lib/mapFeedPostToPost';
import type { Post } from '@/types';

export function HomeFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { posts: raw } = await blogApi.getPublishedFeed(24);
      setPosts(raw.map(mapPublicFeedPostToPost));
    } catch (e) {
      setError(e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mt-10 border-2 border-border bg-card px-6 py-16 text-center shadow-[8px_8px_0_0_var(--border)]">
        <div className="mx-auto mb-4 h-2 max-w-xs overflow-hidden border border-border bg-muted">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-muted-foreground">
          Syncing feed…
        </p>
      </div>
    );
  }

  if (error != null) {
    const isConn = error instanceof BlogApiConnectionError;
    return (
      <div className="mt-10 space-y-5 border-2 border-border bg-card p-6 shadow-[8px_8px_0_0_var(--border)]">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-border bg-muted"
            aria-hidden
          >
            {isConn ? (
              <WifiOff className="size-7 text-muted-foreground" strokeWidth={2.25} />
            ) : (
              <AlertCircle className="size-7 text-destructive" strokeWidth={2.25} />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-sans text-base font-bold text-foreground">
              {isConn ? 'Cannot connect to the server' : 'Could not load the feed'}
            </p>
            {isConn ? (
              <p className="text-sm text-muted-foreground leading-relaxed">Check your connection and try again.</p>
            ) : error instanceof Error && error.message ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{error.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">Something went wrong. Please try again.</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="border-2 border-border bg-card px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wide shadow-[4px_4px_0_0_var(--border)] transition-transform hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="mt-10 border-2 border-dashed border-border bg-muted/30 px-6 py-16 text-center shadow-[6px_6px_0_0_var(--border)]">
        <p className="font-mono text-sm font-black uppercase tracking-wide text-foreground">Index empty</p>
        <p className="mt-3 max-w-md mx-auto text-xs text-muted-foreground leading-relaxed">
          No published posts yet. When someone ships a story, it will appear in this grid.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="mb-6 flex flex-col gap-2 border-b-2 border-dashed border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Live index
          </p>
          <p className="mt-1 font-mono text-sm text-foreground">
            <span className="text-primary font-black">{posts.length}</span>
            <span className="text-muted-foreground"> {posts.length === 1 ? 'entry' : 'entries'} loaded</span>
          </p>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Newest first</p>
      </div>

      <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 sm:gap-3 md:gap-4 lg:grid-cols-3 lg:gap-4">
        {posts.map((post) => (
          <li key={post.id} className="flex min-h-0">
            <BlogCard post={post} />
          </li>
        ))}
      </ul>
    </div>
  );
}
