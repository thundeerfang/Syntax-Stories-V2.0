/**
 * Shared blog/draft types for frontend and API.
 *
 * **`BlogPost.content`** (and draft `content` on save) is **`JSON.stringify(Block[])`** — one JSON array
 * of blocks persisted in MongoDB as a string. Each block has `id`, `type`, optional `sectionId`, and `payload`.
 *
 * Supported **`type`** values (editor + DB):
 * `paragraph` (markdown buffer: bold/italic/underline/links/lists, `[@user](mention:24hexUserId)`, plain `@user`),
 * `heading` (H2/H3 text), `partition` (divider), `image`, `gif`, `videoEmbed`, `githubRepo`, `unsplashImage`,
 * plus `code` / `link` if present in legacy content.
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

/** Markdown string: `**bold**`, `*italic*`, `__underline__`, `[label](https://...)`, `[@handle](mention:ObjectId24)`, `- list` / `1. list`, newlines. */
export interface ParagraphPayload {
  text: string;
}

export interface HeadingPayload {
  text: string;
  level?: HeadingLevel;
}

/** How the image block is shown in the editor and (when implemented) on the published post. */
export type ImageBlockLayout = 'landscape' | 'square' | 'fullWidth';

export interface ImagePayload {
  url?: string;
  /** Optional caption; also used as the image `alt` for accessibility. Legacy drafts may still have `altText` at runtime. */
  title?: string;
  layout?: ImageBlockLayout;
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
