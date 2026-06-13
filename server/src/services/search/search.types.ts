export type SearchEntityType = 'user' | 'tag' | 'category' | 'squad' | 'blog' | 'feature';

export type SearchGroupKey = 'users' | 'tags' | 'categories' | 'squads' | 'blogs' | 'features';

export const SEARCH_GROUP_ORDER: readonly SearchGroupKey[] = [
  'features',
  'blogs',
  'tags',
  'categories',
  'squads',
  'users',
] as const;

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
