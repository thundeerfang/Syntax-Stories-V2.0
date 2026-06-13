/**
 * Unified navbar search JSON API — `GET /api/search`.
 * Constants and group order live in `@syntax-stories/shared`.
 */

import type { SearchGroupKey } from '@syntax-stories/shared';
export type {
  SearchEntityType,
  SearchGroupKey,
  SearchContext,
} from '@syntax-stories/shared';
export {
  SEARCH_GROUP_ORDER,
  SEARCH_MIN_CHARS,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MAX_QUERY_LEN,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
} from '@syntax-stories/shared';

export const SEARCH_GROUP_LABELS: Record<SearchGroupKey, string> = {
  features: 'Features',
  blogs: 'Posts',
  tags: 'Tags',
  categories: 'Categories',
  squads: 'Squads',
  users: 'People',
};

export interface SearchHit {
  id: string;
  type: import('@syntax-stories/shared').SearchEntityType;
  label: string;
  sublabel?: string;
  href: string;
  imageUrl?: string;
  meta?: { postCount?: number; memberCount?: number };
}

export type SearchGroups = Partial<Record<SearchGroupKey, SearchHit[]>>;

export interface UnifiedSearchResponse {
  success: boolean;
  q: string;
  minChars: number;
  cached?: boolean;
  tookMs?: number;
  groups: SearchGroups;
}
