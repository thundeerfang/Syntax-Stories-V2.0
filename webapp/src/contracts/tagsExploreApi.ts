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
}

export type TagListSort = "name-asc" | "name-desc" | "posts-desc" | "recent";

export type CategoryListSort = "name-asc" | "posts-desc";

export interface PaginatedTagsResponse {
  success: boolean;
  list: TagExploreRow[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginatedCategoriesResponse {
  success: boolean;
  list: Array<{
    slug: string;
    name: string;
    description: string;
    postCount: number;
  }>;
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
