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
  tags?: string[];
  /** ISO time of last substantive edit (from API). */
  lastEditedAt?: string;
  lastEditedBy?: { username: string; fullName: string };
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
} from './blog';
