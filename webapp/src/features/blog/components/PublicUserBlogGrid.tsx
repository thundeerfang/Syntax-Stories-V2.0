'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { blogApi } from '@/api/blog';
import { RailFeedErrorState } from '@/components/layout';
import { BlogCard } from './BlogCard';
import { mapPublicFeedPostToPost } from '@/lib/blog/mapFeedPostToPost';
import { useAuthStore } from '@/store/auth';
import type { Post } from '@/types';

export function PublicUserBlogGrid({ username }: Readonly<{ username: string }>) {
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);

  const load = useCallback(async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { posts: raw } = await blogApi.getUserPublishedPosts(username.trim(), 24, token);
      setPosts(raw.map(mapPublicFeedPostToPost));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load blogs');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [username, token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-4 border-4 border-border bg-card p-4 shadow">
      <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
        <FileText className="size-4 text-primary" /> Blog posts
      </h2>

      {loading ? (
        <ul className="grid list-none grid-cols-1 gap-4 p-0">
          {['pub-sk-1', 'pub-sk-2', 'pub-sk-3', 'pub-sk-4', 'pub-sk-5', 'pub-sk-6'].map((key) => (
            <li key={key} className="flex min-h-0">
              <div className="w-full overflow-hidden border-2 border-border bg-card shadow">
                <div className="h-24 w-full animate-pulse border-b-2 border-border bg-muted/40" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-2/3 animate-pulse bg-muted" />
                  <div className="h-2 w-full animate-pulse bg-muted/80" />
                  <div className="h-2 w-5/6 animate-pulse bg-muted/80" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : error ? (
        <RailFeedErrorState
          variant="inline"
          title="Could not load posts"
          description={error}
          onRetry={() => void load()}
        />
      ) : posts.length === 0 ? (
        <p className="ss-empty-dashed-panel py-8 text-center text-[10px] text-muted-foreground">
          No published posts yet.
        </p>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-4 p-0">
          {posts.map((post) => (
            <li key={post.id} className="flex min-h-0">
              <BlogCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
