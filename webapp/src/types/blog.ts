/**
 * Shared blog/draft types for frontend and API.
 *
 * **`BlogPost.content`** (and draft `content` on save) is **`JSON.stringify(Block[])`** — one JSON array
 * of blocks persisted in MongoDB as a string. Each block has `id`, `type`, optional `sectionId`, and `payload`.
 *
 * Supported **`type`** values (editor + DB):
 * `paragraph` (markdown buffer: bold/italic/underline/links/lists, `[@user](mention:24hexUserId)`, plain `@user`),
 * `heading` (H2/H3 text), `partition` (divider), `code` (snippet + `language` / `languageSource`),
 * `image` (`layout`: square | landscape | fullWidth), `videoEmbed` (`layout`, `size`), `githubRepo`, `unsplashImage`,
 * plus `link` if present in legacy content.
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
  | 'unsplashImage'
  | 'table'
  | 'mermaidDiagram';

export type HeadingLevel = 2 | 3;

/** Row from taxonomy API for publish overlay (category or tag). */
export type BlogTaxonomyRow = {
  slug: string;
  name: string;
  postCount: number;
};

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

/** Code block: `language` is a highlight.js id (e.g. `typescript`, `python`). */
export interface CodePayload {
  code?: string;
  language?: string;
  /** `auto` = inferred from snippet; `manual` = author picked from dropdown. */
  languageSource?: 'auto' | 'manual';
}

/** How the image block is shown in the editor and on the published post (stored in DB). */
export type ImageBlockLayout = 'landscape' | 'square' | 'fullWidth';

export interface ImagePayload {
  url?: string;
  /** Optional caption; also used as the image `alt` for accessibility. Legacy drafts may still have `altText` at runtime. */
  title?: string;
  /** `square` | `landscape` | `fullWidth` — persisted on save. */
  layout?: ImageBlockLayout;
}

export type VideoEmbedLayoutDirection = 'row' | 'column';
export type VideoEmbedDisplaySize = 'sm' | 'md' | 'lg';

export interface VideoEmbedPayload {
  /** @deprecated Prefer `videos`. Kept for older drafts. */
  url?: string;
  /** Up to 3 iframe-safe embed URLs (e.g. youtube.com/embed/…). */
  videos?: string[];
  /** `row` | `column` — persisted. */
  layout?: VideoEmbedLayoutDirection;
  /** `sm` | `md` | `lg` — persisted. */
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

/** Tabular data (pasted TSV / pipe tables). */
export interface TablePayload {
  caption?: string;
  /** Row-major cell strings. */
  rows: string[][];
}

export interface MermaidDiagramPayload {
  /** Mermaid diagram source (e.g. `graph TD` …). */
  source: string;
}

export interface UnsplashPayload {
  url?: string;
  photographer?: string;
  caption?: string;
  /** Unsplash photo id for attribution link (`/photos/:id`). */
  unsplashPhotoId?: string;
  /** Same as image blocks: landscape | square | fullWidth. */
  layout?: ImageBlockLayout;
}

export type BlockPayload =
  | ParagraphPayload
  | HeadingPayload
  | CodePayload
  | ImagePayload
  | VideoEmbedPayload
  | GithubRepoPayload
  | UnsplashPayload
  | TablePayload
  | MermaidDiagramPayload
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
  lastEditedAt?: string;
  lastEditedBy?: { username: string; fullName: string };
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
  lastEditedAt?: string;
  lastEditedBy?: { username: string; fullName: string };
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
  lastEditedAt?: string;
  lastEditedBy?: { username: string; fullName: string };
  author: PublicFeedPostAuthor;
}

/** Public comment on a blog post (`GET/POST /api/blog/p/:username/:slug/comments`). */
export interface PublicBlogComment {
  _id: string;
  text: string;
  createdAt: string;
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
