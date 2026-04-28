'use client';

import React from 'react';
import { BlogCard } from '@/components/blog/BlogCard';
import { cn } from '@/lib/utils';
import type { Post } from '@/types';

export type ActivityBlogCardProps = Readonly<{
  post: Post;
  viewerUsername?: string | null;
  className?: string;
}>;

/** Profile activity grid: same content as BlogCard, no lift/shadow or cover zoom on hover. */
export function ActivityBlogCard({ post, viewerUsername = null, className }: ActivityBlogCardProps) {
  return (
    <BlogCard
      post={post}
      showSocialActions={false}
      viewerUsername={viewerUsername}
      density="compact"
      suppressChromeHover
      className={cn('h-full', className)}
    />
  );
}
