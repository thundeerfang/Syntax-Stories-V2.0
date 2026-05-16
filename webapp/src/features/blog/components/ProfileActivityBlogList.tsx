'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { blogApi } from '@/api/blog';
import { CompactBlogPostsSwiper } from './CompactBlogPostsSwiper';
import { mapPublicFeedPostToPost } from '@/lib/blog/mapFeedPostToPost';
import type { Post } from '@/types';

export const PROFILE_ACTIVITY_PREVIEW_LIMIT = 12;

export function profileBlogsPageHref(username: string): string {
  return `/u/${encodeURIComponent(username.trim())}/blogs`;
}

export function ProfileActivityBlogList({
  username,
  limit = PROFILE_ACTIVITY_PREVIEW_LIMIT,
}: Readonly<{ username: string; limit?: number }>) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const load = useCallback(async () => {
    if (!username.trim()) {
      setLoading(false);
      setPosts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { posts: raw } = await blogApi.getUserPublishedPosts(username.trim(), Math.max(limit, 24));
      setPosts(raw.map(mapPublicFeedPostToPost));
    } catch (e) {
      setError(e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [username, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const previewPosts = posts.slice(0, limit);

  return (
    <CompactBlogPostsSwiper
      mode="rail"
      posts={previewPosts}
      loading={loading}
      error={error}
      onRetry={() => void load()}
      aria-label={`@${username} published posts`}
      emptyHeadline="No published posts yet"
      emptySub="When they publish, stories appear here."
      showPagination={previewPosts.length > 1}
      snapSlides
    />
  );
}
