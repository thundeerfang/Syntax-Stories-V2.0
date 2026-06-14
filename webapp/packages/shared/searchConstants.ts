/** Unified search tuning — keep in sync with server `searchQuery.util.ts` behavior. */

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

export const SEARCH_MIN_CHARS = 3;
export const SEARCH_DEBOUNCE_MS = 200;
export const SEARCH_MAX_QUERY_LEN = 64;
export const SEARCH_DEFAULT_LIMIT = 5;
export const SEARCH_MAX_LIMIT = 10;

/** `mention` lowers min chars to 1 when `types=users` only. */
export type SearchContext = 'default' | 'mention';
