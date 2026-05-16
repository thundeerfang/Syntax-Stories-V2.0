export const FOLLOWED_CATEGORIES_STORAGE_KEY = 'syntax-stories.followed-category-slugs';

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim().toLowerCase());
  } catch {
    return [];
  }
}

export function readFollowedCategorySlugs(): string[] {
  if (typeof window === 'undefined') return [];
  return parseList(window.localStorage.getItem(FOLLOWED_CATEGORIES_STORAGE_KEY));
}

export function writeFollowedCategorySlugs(slugs: string[]): void {
  if (typeof window === 'undefined') return;
  const next = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  window.localStorage.setItem(FOLLOWED_CATEGORIES_STORAGE_KEY, JSON.stringify(next));
}

/** Returns new following state (true = now following). */
export function toggleFollowedCategorySlug(slug: string): boolean {
  const key = slug.trim().toLowerCase();
  if (!key) return false;
  const cur = readFollowedCategorySlugs();
  const has = cur.includes(key);
  const next = has ? cur.filter((s) => s !== key) : [...cur, key];
  writeFollowedCategorySlugs(next);
  return !has;
}

export function isCategorySlugFollowed(slug: string): boolean {
  const key = slug.trim().toLowerCase();
  if (!key) return false;
  return readFollowedCategorySlugs().includes(key);
}
