'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { blogApi } from '@/api/blog';
import { BlogCard } from '@/components/blog/BlogCard';
import { mapPublicFeedPostToPost } from '@/lib/mapFeedPostToPost';
import { useAuthStore } from '@/store/auth';
import type { Post } from '@/types';

export function PublicUserBlogGrid({ username }: Readonly<{ username: string }>) {
  const viewerUsername = useAuthStore((s) => s.user?.username ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);

  const load = useCallback(async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { posts: raw } = await blogApi.getUserPublishedPosts(username.trim(), 24);
      setPosts(raw.map(mapPublicFeedPostToPost));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load blogs');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
      <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
        <FileText className="size-4 text-primary" /> Blog posts
      </h2>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="font-mono text-[10px] uppercase tracking-widest">Loading…</span>
        </div>
      ) : error ? (
        <p className="border-2 border-dashed border-destructive/30 bg-destructive/5 py-6 text-center text-[10px] text-muted-foreground">{error}</p>
      ) : posts.length === 0 ? (
        <p className="border-2 border-dashed border-border bg-muted/20 py-8 text-center text-[10px] text-muted-foreground">
          No published posts yet.
        </p>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-2">
          {posts.map((post) => (
            <li key={post.id} className="flex min-h-0">
              <BlogCard post={post} showSocialActions={false} viewerUsername={viewerUsername} density="compact" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
