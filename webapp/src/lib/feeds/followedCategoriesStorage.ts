export const FOLLOWED_CATEGORIES_STORAGE_KEY = 'syntax-stories.followed-category-slugs';
export const FOLLOWED_CATEGORIES_CHANGED_EVENT = 'syntax-stories:followed-categories-changed';

function storageKeyForUser(userId: string | null | undefined): string {
  const id = userId?.trim();
  return id ? `${FOLLOWED_CATEGORIES_STORAGE_KEY}:user:${id}` : `${FOLLOWED_CATEGORIES_STORAGE_KEY}:guest`;
}

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

/** One-time: copy legacy global list into the active user key. */
function migrateLegacyList(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const key = storageKeyForUser(userId);
  if (window.localStorage.getItem(key)) return;
  const legacy = window.localStorage.getItem(FOLLOWED_CATEGORIES_STORAGE_KEY);
  if (!legacy) return;
  window.localStorage.setItem(key, legacy);
}

function notifyChanged(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(FOLLOWED_CATEGORIES_CHANGED_EVENT, {
      detail: { userId: userId?.trim() || null },
    }),
  );
}

export function readFollowedCategorySlugs(userId: string | null | undefined): string[] {
  if (typeof window === 'undefined') return [];
  migrateLegacyList(userId);
  return parseList(window.localStorage.getItem(storageKeyForUser(userId)));
}

export function writeFollowedCategorySlugs(slugs: string[], userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const next = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  window.localStorage.setItem(storageKeyForUser(userId), JSON.stringify(next));
  notifyChanged(userId);
}

/** Returns new following state (true = now following). Scoped per signed-in user. */
export function toggleFollowedCategorySlug(slug: string, userId: string | null | undefined): boolean {
  const key = slug.trim().toLowerCase();
  if (!key) return false;
  const cur = readFollowedCategorySlugs(userId);
  const has = cur.includes(key);
  const next = has ? cur.filter((s) => s !== key) : [...cur, key];
  writeFollowedCategorySlugs(next, userId);
  return !has;
}

export function isCategorySlugFollowed(slug: string, userId: string | null | undefined): boolean {
  const key = slug.trim().toLowerCase();
  if (!key) return false;
  return readFollowedCategorySlugs(userId).includes(key);
}
