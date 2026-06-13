import type { SearchGroupKey } from '@syntax-stories/shared';
import { SEARCH_GROUP_ORDER } from '@syntax-stories/shared';

export type SearchEntityType = 'user' | 'tag' | 'category' | 'squad' | 'blog' | 'feature';

export type { SearchGroupKey };
export { SEARCH_GROUP_ORDER };
export const ALL_SEARCH_GROUP_KEYS: readonly SearchGroupKey[] = SEARCH_GROUP_ORDER;

export interface SearchHit {
  id: string;
  type: SearchEntityType;
  label: string;
  sublabel?: string;
  href: string;
  imageUrl?: string;
  meta?: { postCount?: number; memberCount?: number };
}

export type SearchGroups = Partial<Record<SearchGroupKey, SearchHit[]>>;

export interface UnifiedSearchResult {
  success: true;
  q: string;
  minChars: number;
  cached: boolean;
  tookMs: number;
  groups: SearchGroups;
}

export interface SearchIndexDoc {
  id: string;
  type: SearchEntityType;
  label: string;
  sublabel?: string;
  href: string;
  imageUrl?: string;
  tokens: string;
  rank?: number;
  meta?: { postCount?: number; memberCount?: number };
}
