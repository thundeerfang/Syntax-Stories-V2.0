'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { blogApi } from '@/api/blog';
import { BlogCard } from '@/components/blog/BlogCard';
import { mapPublicFeedPostToPost } from '@/lib/mapFeedPostToPost';
import { useAuthStore } from '@/store/auth';
import type { Post } from '@/types';

export function HomeFeed() {
  const viewerUsername = useAuthStore((s) => s.user?.username ?? null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { posts: raw } = await blogApi.getPublishedFeed(24);
      setPosts(raw.map(mapPublicFeedPostToPost));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load blogs');
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

  if (error) {
    return (
      <div className="mt-10 space-y-4 border-2 border-border bg-destructive/5 p-6 shadow-[8px_8px_0_0_var(--border)]">
        <p className="font-mono text-sm font-bold uppercase text-destructive">{error}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Check that the API is running and{' '}
          <code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            NEXT_PUBLIC_API_BASE_URL
          </code>{' '}
          points to it.
        </p>
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

      <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-2 lg:gap-5 2xl:grid-cols-3">
        {posts.map((post) => (
          <li key={post.id} className="flex min-h-0">
            <BlogCard post={post} viewerUsername={viewerUsername} density="compact" />
          </li>
        ))}
      </ul>
    </div>
  );
}
