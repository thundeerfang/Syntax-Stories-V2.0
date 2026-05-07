import type { HelpBodyFormat } from './helpArticle.model.js';

export const HELP_LIST_PIPELINE_VERSION = 1;
export const HELP_API_RESPONSE_VERSION = 1;

/** Public read — never spread raw Mongoose docs. */
export type HelpArticlePublicDTO = {
  slug: string;
  canonicalPath: string;
  title: string;
  summary: string;
  body: string;
  bodyFormat: HelpBodyFormat;
  category: string;
  tags: string[];
  updatedAt: string;
  publishedAt: string | null;
  /** Present when requested slug was a legacy slug; client should redirect. */
  redirectTo?: string;
};

export type HelpArticleListEnvelope = {
  version: typeof HELP_API_RESPONSE_VERSION;
  listPipelineVersion: typeof HELP_LIST_PIPELINE_VERSION;
  data: HelpArticlePublicDTO[];
  page: number;
  pageSize: number;
  total: number;
};

export type HelpArticleAdminListItem = {
  _id: string;
  slug: string;
  title: string;
  status: string;
  isPublished: boolean;
  draftVersion: number;
  publishedVersion: number;
  publishAt: string | null;
  updatedAt: string;
  authorId: string;
};
