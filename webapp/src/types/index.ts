export interface User {
  id: string;
  email: string;
  name: string;
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
} from './blog';
