/**
 * Shared blog/draft types for frontend and API.
 * Content is stored as JSON string of Block[]; these types match the editor blocks and styles.
 */

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'partition'
  | 'image'
  | 'gif'
  | 'videoEmbed'
  | 'link'
  | 'githubRepo'
  | 'unsplashImage';

export type HeadingLevel = 2 | 3;

export interface BlockBase {
  id: string;
  type: BlockType;
  sectionId?: string;
}

export interface ParagraphPayload {
  text: string;
}

export interface HeadingPayload {
  text: string;
  level?: HeadingLevel;
}

export interface ImagePayload {
  url?: string;
  altText?: string;
  caption?: string;
}

export interface GifPayload {
  url?: string;
  caption?: string;
}

export interface VideoEmbedPayload {
  url?: string;
}

export interface GithubRepoPayload {
  owner?: string;
  repo?: string;
  name?: string;
  url?: string;
  description?: string;
  avatarUrl?: string;
}

export interface UnsplashPayload {
  url?: string;
  photographer?: string;
  caption?: string;
}

export type BlockPayload =
  | ParagraphPayload
  | HeadingPayload
  | ImagePayload
  | GifPayload
  | VideoEmbedPayload
  | GithubRepoPayload
  | UnsplashPayload
  | Record<string, unknown>;

export interface Block extends BlockBase {
  payload?: BlockPayload;
}

/** Draft payload sent to API (content = JSON.stringify(Block[])) */
export interface BlogDraftPayload {
  title: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
}

/** Stored draft in localStorage (includes preview URL for thumb) */
export interface StoredDraftPayload {
  title: string;
  summary: string;
  content: string;
  thumbnailPreviewUrl?: string;
  savedAt: number;
}

/** Server response for a single blog post or draft */
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
}
