/**
 * Shared blog/draft types for frontend and API.
 *
 * **`BlogPost.content`** (and draft `content` on save) is **`JSON.stringify(Block[])`** — one JSON array
 * of blocks persisted in MongoDB as a string. Each block has `id`, `type`, optional `sectionId`, and `payload`.
 *
 * Supported **`type`** values (editor + DB):
 * `paragraph` (markdown buffer: bold/italic/underline/links/lists, `[@user](mention:24hexUserId)`, plain `@user`),
 * `heading` (H2/H3 text), `partition` (divider), `image`, `videoEmbed`, `githubRepo`, `unsplashImage`,
 * plus `code` / `link` if present in legacy content.
 */

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'partition'
  | 'image'
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

/** ProseMirror-style JSON document used for rich-text paragraphs. */

/**
 * Paragraph content.
 *
 * Historically this was a plain markdown-ish string in `text`. Going forward,
 * `doc` is the source of truth for rich-text content (inline formatting, GIFs, etc.).
 * `text` is kept for backwards compatibility and as an optional denormalised summary.
 */
export interface ParagraphPayload {
  /** Legacy markdown/plain text buffer. May be empty when `doc` is present. */
  text?: string;
  /** Rich-text document (ProseMirror/TipTap JSON). */
  doc?: any;
  /** Optional flag to indicate whether this payload was authored with rich-text. */
  version?: 'plain' | 'rich-text';
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

export type VideoEmbedLayoutDirection = 'row' | 'column';
export type VideoEmbedDisplaySize = 'sm' | 'md' | 'lg';

export interface VideoEmbedPayload {
  /** @deprecated Prefer `videos`. Kept for older drafts. */
  url?: string;
  /** Up to 3 iframe-safe embed URLs (e.g. youtube.com/embed/…). */
  videos?: string[];
  layout?: VideoEmbedLayoutDirection;
  size?: VideoEmbedDisplaySize;
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

/** Public home feed item (`GET /api/blog/feed`). */
export interface PublicFeedPostAuthor {
  username: string;
  fullName: string;
  profileImg: string;
}

export interface PublicFeedPost {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnailUrl?: string;
  updatedAt: string;
  createdAt: string;
  author: PublicFeedPostAuthor;
}

/** Public single post (`GET /api/blog/p/:username/:slug`). */
export interface PublicBlogPostDetail {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  author: PublicFeedPostAuthor;
}

/**
 * Helper: ensure we always have a rich-text doc for a paragraph, even when only the
 * legacy `text` field is present. This does not mutate the original payload.
 */
export function coerceParagraphDoc(payload: ParagraphPayload): any {
  if (payload.doc) return payload.doc;
  const text = (payload.text ?? '').toString();
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: text ? [{ type: 'text', text }] : [],
      },
    ],
  };
}
