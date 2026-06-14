import { summaryToPlainText } from "@/lib/blog/summaryPlain";
import type { Post } from "@/types";
import type { PublicFeedPost } from "@/types/blog";
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
      typeof item.createdAt === "string" && item.createdAt.trim()
        ? item.createdAt
        : typeof item.updatedAt === "string"
          ? item.updatedAt
          : new Date(item.updatedAt).toISOString(),
    blogStatus: "published",
    category: item.category,
    tags: item.tags,
    respectCount:
      typeof item.respectCount === "number" ? item.respectCount : undefined,
    repostCount:
      typeof item.repostCount === "number" ? item.repostCount : undefined,
    bookmarkCount:
      typeof item.bookmarkCount === "number" ? item.bookmarkCount : undefined,
    commentCount:
      typeof item.commentCount === "number" ? item.commentCount : undefined,
    viewerHasRespected:
      typeof item.viewerHasRespected === "boolean"
        ? item.viewerHasRespected
        : undefined,
    viewerHasReposted:
      typeof item.viewerHasReposted === "boolean"
        ? item.viewerHasReposted
        : undefined,
    viewerHasBookmarked:
      typeof item.viewerHasBookmarked === "boolean"
        ? item.viewerHasBookmarked
        : undefined,
    lastEditedAt: item.lastEditedAt,
    lastEditedBy: item.lastEditedBy,
    readTimeMinutes:
      typeof item.readTimeMinutes === "number"
        ? item.readTimeMinutes
        : undefined,
    squad: item.squad,
  };
}
