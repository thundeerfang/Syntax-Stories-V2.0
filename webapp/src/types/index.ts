import type { PublicFeedSquad } from './blog';

export interface User {
  id: string;
  email?: string;
  name: string;
  /** Public profile handle; used in blog URLs `/blogs/[username]/[slug]`. */
  username?: string;
  image?: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  coverImage?: string;
  author: User;
  publishedAt: string;
  /** When mapped from owner API; feeds omit this. */
  blogStatus?: 'draft' | 'published';
  /** Curated category slug from API (feed / detail). */
  category?: string;
  tags?: string[];
  /** From public blog API when wired. */
  respectCount?: number;
  repostCount?: number;
  bookmarkCount?: number;
  /** From public feed when provided. */
  commentCount?: number;
  viewerHasRespected?: boolean;
  viewerHasReposted?: boolean;
  viewerHasBookmarked?: boolean;
  /** ISO time of last substantive edit (from the API). */
  lastEditedAt?: string;
  lastEditedBy?: { username: string; fullName: string };
  /** From API when provided; otherwise derived from excerpt in the card. */
  readTimeMinutes?: number;
  /** Present when the post is linked to a squad feed. */
  squad?: PublicFeedSquad;
}

export type {
  BlockType,
  Block,
  BlockBase,
  BlogDraftPayload,
  StoredDraftPayload,
  BlogPostResponse,
  PublicFeedPost,
  PublicFeedPostAuthor,
  PublicBlogPostDetail,
  PublicBlogComment,
  PublicFeedSquad,
} from './blog';
