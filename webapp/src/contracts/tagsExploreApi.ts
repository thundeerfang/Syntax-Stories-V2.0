/**
 * Blog tags explore JSON API — `GET /api/blog/tags/explore`.
 * Keep in sync with `server/src/routes/blog.routes.ts` (`getBlogTagsExplore`).
 */

export interface TagExploreRow {
  slug: string;
  name: string;
  postCount: number;
  lastUsedAt?: string;
}

export interface TagsExploreResponse {
  success: boolean;
  trending: TagExploreRow[];
  popular: TagExploreRow[];
  recent: TagExploreRow[];
  allTags: TagExploreRow[];
}
