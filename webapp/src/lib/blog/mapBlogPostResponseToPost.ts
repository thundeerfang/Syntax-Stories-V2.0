import { summaryToPlainText } from '@/lib/blog/summaryPlain';
import type { Post } from '@/types';
import type { BlogPostResponse } from '@/types/blog';

/** Map owner `listMyPosts` item to `BlogCard` post shape. */
export function mapBlogPostResponseToPost(
  p: BlogPostResponse,
  author: Readonly<{ username: string; displayName: string; profileImg?: string }>,
): Post {
  const publishedAt =
    p.status === 'published'
      ? (p.createdAt && String(p.createdAt).trim() ? p.createdAt : p.updatedAt)
      : p.updatedAt;
  return {
    id: p._id,
    title: p.title,
    slug: p.slug,
    excerpt: summaryToPlainText(p.summary ?? ''),
    coverImage: p.thumbnailUrl,
    author: {
      id: author.username,
      name: author.displayName,
      username: author.username,
      image: author.profileImg,
    },
    publishedAt,
    blogStatus: p.status,
    category: p.category,
    tags: p.tags,
    lastEditedAt: p.lastEditedAt,
    lastEditedBy: p.lastEditedBy,
    readTimeMinutes: typeof p.readTimeMinutes === 'number' ? p.readTimeMinutes : undefined,
    respectCount: typeof p.respectCount === 'number' ? p.respectCount : undefined,
    repostCount: typeof p.repostCount === 'number' ? p.repostCount : undefined,
    bookmarkCount: typeof p.bookmarkCount === 'number' ? p.bookmarkCount : undefined,
    commentCount: typeof p.commentCount === 'number' ? p.commentCount : undefined,
    viewerHasRespected:
      typeof p.viewerHasRespected === 'boolean' ? p.viewerHasRespected : undefined,
    viewerHasReposted:
      typeof p.viewerHasReposted === 'boolean' ? p.viewerHasReposted : undefined,
    viewerHasBookmarked:
      typeof p.viewerHasBookmarked === 'boolean' ? p.viewerHasBookmarked : undefined,
    squad: p.squad,
  };
}
