/**
 * Reposts library JSON API — `/api/reposts/*`.
 * Keep in sync with `server/src/routes/repost.routes.ts`.
 */

export type RepostsListSort = 'recent' | 'oldest';

/** `GET /api/reposts/posts` query */
export interface ListRepostedPostsQuery {
  q?: string;
  limit?: number;
  sort?: RepostsListSort;
}
