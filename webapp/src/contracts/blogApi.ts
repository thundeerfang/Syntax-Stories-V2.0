/**
 * Blog JSON API — `/api/blog/*`.
 * Public feed/detail types (`PublicFeedPost`, etc.) live in `@/types/blog`.
 * Keep in sync with `server/src/routes/blog.routes.ts`.
 */

import type { BlogTaxonomyRow, PublicFeedSquad } from '@/types/blog';

export interface CreatePostPayload {
  title: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
  status?: 'draft' | 'published';
  category?: string;
  tags?: string[];
  language?: string;
  squadId?: string;
}

export interface BlogPostResponse {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  squadId?: string;
  deletedAt?: string;
  category?: string;
  tags?: string[];
  language?: string;
  readTimeMinutes?: number;
  respectCount?: number;
  repostCount?: number;
  bookmarkCount?: number;
  commentCount?: number;
  viewerHasRespected?: boolean;
  viewerHasReposted?: boolean;
  viewerHasBookmarked?: boolean;
  squad?: PublicFeedSquad;
}

export interface GetDraftResponse {
  success: boolean;
  draft: BlogPostResponse | null;
}

/** `GET /api/blog/taxonomy` */
export interface BlogTaxonomyResponse {
  success: boolean;
  categories: BlogTaxonomyRow[];
  tags: BlogTaxonomyRow[];
}

/** `POST /api/blog/engagement/viewer-state` body */
export interface BlogEngagementViewerStateBody {
  postIds: string[];
}
