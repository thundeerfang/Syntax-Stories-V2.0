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
  tags?: string[];
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
} from './blog';
