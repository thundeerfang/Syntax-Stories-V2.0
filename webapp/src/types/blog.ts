export type BlockType =
  | "paragraph"
  | "heading"
  | "code"
  | "partition"
  | "image"
  | "videoEmbed"
  | "link"
  | "githubRepo"
  | "unsplashImage"
  | "table"
  | "mermaidDiagram";
export type HeadingLevel = 2 | 3;
export interface BlockBase {
  id: string;
  type: BlockType;
  sectionId?: string;
}
export interface ParagraphPayload {
  text?: string;
  doc?: any;
  version?: "plain" | "rich-text";
}
export interface HeadingPayload {
  text: string;
  level?: HeadingLevel;
}
export interface CodePayload {
  code?: string;
  language?: string;
  languageSource?: "auto" | "manual";
}
export type ImageBlockLayout = "landscape" | "square" | "fullWidth";
export interface ImagePayload {
  url?: string;
  title?: string;
  layout?: ImageBlockLayout;
}
export type VideoEmbedLayoutDirection = "row" | "column";
export type VideoEmbedDisplaySize = "sm" | "md" | "lg";
export interface VideoEmbedPayload {
  url?: string;
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
export interface TablePayload {
  caption?: string;
  rows: string[][];
}
export interface MermaidDiagramPayload {
  source: string;
}
export interface UnsplashPayload {
  url?: string;
  photographer?: string;
  caption?: string;
  unsplashPhotoId?: string;
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
export interface BlogDraftPayload {
  title: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
}
export interface StoredDraftPayload {
  title: string;
  summary: string;
  content: string;
  thumbnailPreviewUrl?: string;
  savedAt: number;
}
export interface BlogTaxonomyRow {
  slug: string;
  name: string;
  postCount: number;
  description?: string;
}
export interface BlogPostResponse {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  lastEditedAt?: string;
  lastEditedBy?: {
    username: string;
    fullName: string;
  };
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
export interface PublicFeedPostAuthor {
  username: string;
  fullName: string;
  profileImg: string;
}
export interface PublicFeedSquad {
  slug: string;
  name: string;
  iconUrl?: string;
  coverBannerUrl?: string;
  visibility: "public" | "private";
  memberCount?: number;
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
  lastEditedBy?: {
    username: string;
    fullName: string;
  };
  author: PublicFeedPostAuthor;
  category?: string;
  tags?: string[];
  language?: string;
  respectCount?: number;
  repostCount?: number;
  bookmarkCount?: number;
  commentCount?: number;
  viewCount?: number;
  viewerHasRespected?: boolean;
  viewerHasReposted?: boolean;
  viewerHasBookmarked?: boolean;
  readTimeMinutes?: number;
  squad?: PublicFeedSquad;
}
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
  lastEditedBy?: {
    username: string;
    fullName: string;
  };
  author: PublicFeedPostAuthor;
  category?: string;
  tags?: string[];
  language?: string;
  respectCount?: number;
  repostCount?: number;
  bookmarkCount?: number;
  commentCount?: number;
  viewCount?: number;
  viewerHasRespected?: boolean;
  viewerHasReposted?: boolean;
  viewerHasBookmarked?: boolean;
  squad?: PublicFeedSquad;
}
export interface PublicBlogComment {
  _id: string;
  parentId: string | null;
  text: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  authorUserId: string;
  likeCount: number;
  likedByViewer?: boolean;
  author: PublicFeedPostAuthor;
  directReplyCount?: number;
}
export function coerceParagraphDoc(payload: ParagraphPayload): any {
  if (payload.doc) return payload.doc;
  const text = (payload.text ?? "").toString();
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  };
}
