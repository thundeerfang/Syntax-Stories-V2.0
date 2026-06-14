import type { PublicFeedSquad } from "./blog";
export interface User {
  id: string;
  email?: string;
  name: string;
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
  blogStatus?: "draft" | "published";
  category?: string;
  tags?: string[];
  respectCount?: number;
  repostCount?: number;
  bookmarkCount?: number;
  commentCount?: number;
  viewerHasRespected?: boolean;
  viewerHasReposted?: boolean;
  viewerHasBookmarked?: boolean;
  lastEditedAt?: string;
  lastEditedBy?: {
    username: string;
    fullName: string;
  };
  readTimeMinutes?: number;
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
} from "./blog";
