'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Hash } from 'lucide-react';
import { blogApi } from '@/api/blog';
import { BlogCard } from '@/components/blog/BlogCard';
import { ShellPageIntroHeader } from '@/components/layout/ShellPageIntroHeader';
import { FollowingPostsGridSkeleton } from '@/components/skeletons/FollowingPageSkeleton';
import { mapPublicFeedPostToPost } from '@/lib/mapFeedPostToPost';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';
import { cn } from '@/lib/utils';
import type { Post } from '@/types';

/** Tag stream under Topics: `/topics/{slug}` (e.g. `/topics/javascript`). */
export default function TopicsTagFeedPage() {
  const params = useParams();
  const raw = params?.slug;
  const tagSlug = typeof raw === 'string' ? decodeURIComponent(raw) : '';
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tagSlug) {
      setLoading(false);
      setPosts([]);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const { posts: rawPosts } = await blogApi.getPublishedFeed(48, { tag: tagSlug });
      setPosts(rawPosts.map(mapPublicFeedPostToPost));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [tagSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <ShellPageIntroHeader
          breadcrumbItems={[
            { href: '/', label: 'Home' },
            { href: '/topics', label: 'Topics' },
            { label: tagSlug ? `#${tagSlug}` : 'Tag' },
          ]}
          description="Stories published with this tag across the community."
          title={
            <h1 className="flex items-center gap-2 text-2xl font-black uppercase italic tracking-tighter text-foreground sm:text-3xl lg:text-4xl">
              <Hash className="size-7 shrink-0 text-primary sm:size-8" strokeWidth={2.5} aria-hidden />
              <span className="min-w-0 break-words normal-case not-italic tracking-tight text-foreground">
                {tagSlug || '…'}
              </span>
            </h1>
          }
        />

        {errorMsg ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMsg}
          </p>
        ) : null}

        <section aria-label="Posts with this tag" className="min-w-0">
          {!tagSlug ? (
            <p className="text-sm text-muted-foreground">Invalid tag.</p>
          ) : loading ? (
            <FollowingPostsGridSkeleton />
          ) : posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published posts with this tag yet.{' '}
              <Link href="/topics" className="font-medium text-primary underline-offset-4 hover:underline">
                Browse topics
              </Link>
            </p>
          ) : (
            <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.id} className="flex min-h-0">
                  <BlogCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
