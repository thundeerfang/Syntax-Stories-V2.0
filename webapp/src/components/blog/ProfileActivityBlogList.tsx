"use client";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  type RefObject,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { blogApi } from "@/api/blog";
import {
  CompactBlogPostsSwiper,
  type CompactBlogPostsSwiperHandle,
} from "./CompactBlogPostsSwiper";
import { mapPublicFeedPostToPost } from "@/lib/blog/mapFeedPostToPost";
import type { ActivityTab } from "@/lib/profile/profilePageHelpers";
import type { Post } from "@/types";
import { blog } from "@/lib/styles";
import { PROFILE_ACTIVITY_PREVIEW_LIMIT } from "@/variable";
export { PROFILE_ACTIVITY_PREVIEW_LIMIT } from "@/variable";
export type ProfileActivityKind = ActivityTab;
export function profileBlogsPageHref(username: string): string {
  return `/u/${encodeURIComponent(username.trim())}/blogs`;
}
export function ProfileActivitySwiperNav({
  swiperRef,
}: Readonly<{
  swiperRef: RefObject<CompactBlogPostsSwiperHandle | null>;
}>) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        aria-label="Scroll stories left"
        onClick={() => swiperRef.current?.scrollPrev()}
        className={blog.swiperNavBtn}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Scroll stories right"
        onClick={() => swiperRef.current?.scrollNext()}
        className={blog.swiperNavBtn}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
const ACTIVITY_COPY: Record<
  ProfileActivityKind,
  {
    ariaLabel: string;
    emptyHeadline: string;
    emptySub: string;
  }
> = {
  posts: {
    ariaLabel: "published posts",
    emptyHeadline: "No published posts yet",
    emptySub: "When they publish, stories appear here.",
  },
  replies: {
    ariaLabel: "posts replied to",
    emptyHeadline: "No replies yet",
    emptySub: "Comments on stories show up here.",
  },
  repost: {
    ariaLabel: "reposted posts",
    emptyHeadline: "No reposts yet",
    emptySub: "Reposted stories appear here.",
  },
};
export const ProfileActivityBlogList = forwardRef<
  CompactBlogPostsSwiperHandle,
  Readonly<{
    username: string;
    kind?: ProfileActivityKind;
    limit?: number;
    accessToken?: string | null;
  }>
>(function ProfileActivityBlogList(
  {
    username,
    kind = "posts",
    limit = PROFILE_ACTIVITY_PREVIEW_LIMIT,
    accessToken = null,
  },
  ref,
) {
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
      const fetchLimit = Math.max(limit, 24);
      const res =
        kind === "repost"
          ? await blogApi.getUserRepostedPosts(
              username.trim(),
              fetchLimit,
              accessToken,
            )
          : kind === "replies"
            ? await blogApi.getUserRepliedPosts(
                username.trim(),
                fetchLimit,
                accessToken,
              )
            : await blogApi.getUserPublishedPosts(
                username.trim(),
                fetchLimit,
                accessToken,
              );
      setPosts(res.posts.map(mapPublicFeedPostToPost));
    } catch (e) {
      setError(e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [username, kind, limit, accessToken]);
  useEffect(() => {
    void load();
  }, [load]);
  const previewPosts = posts.slice(0, limit);
  const copy = ACTIVITY_COPY[kind];
  return (
    <CompactBlogPostsSwiper
      ref={ref}
      mode="rail"
      posts={previewPosts}
      loading={loading}
      error={error}
      onRetry={() => void load()}
      aria-label={`@${username} ${copy.ariaLabel}`}
      emptyHeadline={copy.emptyHeadline}
      emptySub={copy.emptySub}
      showToolbarArrows={false}
      showPagination={previewPosts.length > 1}
      snapSlides
    />
  );
});
ProfileActivityBlogList.displayName = "ProfileActivityBlogList";
