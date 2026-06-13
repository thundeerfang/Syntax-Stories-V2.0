/**
 * Unified navbar search JSON API — `GET /api/search`.
 * Keep in sync with `server/src/routes/search.routes.ts`.
 */

export type SearchEntityType = 'user' | 'tag' | 'category' | 'squad' | 'blog' | 'feature';

export type SearchGroupKey =
  | 'users'
  | 'tags'
  | 'categories'
  | 'squads'
  | 'blogs'
  | 'features';

export const SEARCH_GROUP_ORDER: readonly SearchGroupKey[] = [
  'features',
  'blogs',
  'tags',
  'categories',
  'squads',
  'users',
] as const;

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
  type: SearchEntityType;
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

export const SEARCH_MIN_CHARS = 3;
export const SEARCH_DEBOUNCE_MS = 200;
