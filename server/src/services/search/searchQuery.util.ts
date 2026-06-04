import crypto from 'node:crypto';

export const SEARCH_MIN_CHARS = 3;
export const SEARCH_MAX_QUERY_LEN = 64;
export const SEARCH_DEFAULT_LIMIT = 5;
export const SEARCH_MAX_LIMIT = 10;

export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, SEARCH_MAX_QUERY_LEN);
}

export function escapeRegex(q: string): string {
  return q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hashSearchQuery(q: string): string {
  return crypto.createHash('sha256').update(q.toLowerCase()).digest('hex').slice(0, 16);
}

export function parseSearchLimit(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return SEARCH_DEFAULT_LIMIT;
  return Math.min(n, SEARCH_MAX_LIMIT);
}

export function parseSearchTypes(raw: unknown): string[] {
  const all = 'all';
  const s = String(raw ?? all).trim().toLowerCase();
  if (!s || s === all) {
    return ['users', 'tags', 'categories', 'squads', 'blogs', 'features'];
  }
  return s
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}
