import { SEARCH_MIN_CHARS } from '@contracts/searchApi';

export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function isSearchQueryReady(raw: string): boolean {
  return normalizeSearchQuery(raw).length >= SEARCH_MIN_CHARS;
}

export function searchQueryCharCount(raw: string): number {
  return normalizeSearchQuery(raw).length;
}
