'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { blogApi } from '@/api/blog';
import { BlogCard } from '@/components/blog/BlogCard';
import { mapPublicFeedPostToPost } from '@/lib/mapFeedPostToPost';
import { useAuthStore } from '@/store/auth';
import type { Post } from '@/types';

export function ProfileActivityBlogList({ username }: Readonly<{ username: string }>) {
  const viewerUsername = useAuthStore((s) => s.user?.username ?? null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!username.trim()) {
      setLoading(false);
      setPosts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { posts: raw } = await blogApi.getUserPublishedPosts(username.trim(), 24);
      setPosts(raw.map(mapPublicFeedPostToPost));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="font-mono text-[10px] uppercase tracking-widest">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="border-2 border-dashed border-destructive/30 bg-destructive/5 py-6 text-center font-mono text-[10px] text-muted-foreground">
        {error}
      </p>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        No published posts in this feed yet.
      </p>
    );
  }

  return (
    <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
      {posts.map((post) => (
        <li key={post.id} className="min-h-0">
          <BlogCard post={post} showSocialActions={false} viewerUsername={viewerUsername} density="compact" />
        </li>
      ))}
    </ul>
  );
}
