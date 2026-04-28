import { summaryToPlainText } from '@/lib/summaryPlain';
import type { Post } from '@/types';
import type { PublicFeedPost } from '@/types/blog';

/** Map API feed / user-post payload to home card `Post` shape. */
export function mapPublicFeedPostToPost(item: PublicFeedPost): Post {
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
    publishedAt:
      typeof item.createdAt === 'string' && item.createdAt.trim()
        ? item.createdAt
        : typeof item.updatedAt === 'string'
          ? item.updatedAt
          : new Date(item.updatedAt).toISOString(),
    blogStatus: 'published',
    lastEditedAt: item.lastEditedAt,
    lastEditedBy: item.lastEditedBy,
  };
}
