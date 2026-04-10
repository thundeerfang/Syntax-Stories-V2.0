'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { blogApi } from '@/api/blog';
import { BlogCard } from '@/components/home/BlogCard';
import { summaryToPlainText } from '@/lib/summaryPlain';
import type { Post } from '@/types';
import type { PublicFeedPost } from '@/types/blog';

function feedItemToPost(item: PublicFeedPost): Post {
  return {
    id: item._id,
    title: item.title,
    slug: item.slug,
    excerpt: summaryToPlainText(item.summary),
    coverImage: item.thumbnailUrl,
    author: {
      id: item.author.username,
      name: item.author.fullName,
      username: item.author.username,
      image: item.author.profileImg,
    },
    publishedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date(item.updatedAt).toISOString(),
  };
}

export function HomeFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { posts: raw } = await blogApi.getPublishedFeed(24);
      setPosts(raw.map(feedItemToPost));
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
      <div className="mt-8 border-2 border-dashed border-border bg-muted/20 px-4 py-10 text-center shadow-[4px_4px_0_0_var(--border)]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Loading feed…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 space-y-3 border-2 border-border bg-destructive/5 p-4 shadow-[4px_4px_0_0_var(--border)]">
        <p className="text-sm font-semibold text-destructive">{error}</p>
        <p className="text-xs text-muted-foreground">
          Check that the API is running and <code className="border border-border bg-muted px-1">NEXT_PUBLIC_API_BASE_URL</code>{' '}
          points to it.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="border-2 border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide shadow-[2px_2px_0_0_var(--border)] hover:bg-muted/80"
        >
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="mt-8 border-2 border-border bg-muted/20 px-4 py-12 text-center shadow-[4px_4px_0_0_var(--border)]">
        <p className="text-sm font-semibold text-foreground">No published posts yet</p>
        <p className="mt-2 text-xs text-muted-foreground">
          When someone publishes a story, it will show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-8 list-none space-y-5 p-0">
      {posts.map((post) => (
        <li key={post.id}>
          <BlogCard post={post} />
        </li>
      ))}
    </ul>
  );
}
