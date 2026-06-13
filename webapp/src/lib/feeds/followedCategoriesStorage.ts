export const FOLLOWED_CATEGORIES_STORAGE_KEY = 'syntax-stories.followed-category-slugs';
export const FOLLOWED_CATEGORIES_CHANGED_EVENT = 'syntax-stories:followed-categories-changed';

function storageKeyForUser(userId: string | null | undefined): string | null {
  const id = userId?.trim();
  return id ? `${FOLLOWED_CATEGORIES_STORAGE_KEY}:user:${id}` : null;
}

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((s) => s.trim().toLowerCase());
  } catch {
    return [];
  }
}

/** One-time: copy legacy global list into the active user key. */
function migrateLegacyList(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const key = storageKeyForUser(userId);
  if (!key) return;
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
    })
  );
}

export function readFollowedCategorySlugs(userId: string | null | undefined): string[] {
  if (typeof window === 'undefined') return [];
  if (!userId?.trim()) return [];
  migrateLegacyList(userId);
  const storageKey = storageKeyForUser(userId);
  if (!storageKey) return [];
  return parseList(window.localStorage.getItem(storageKey));
}

export function writeFollowedCategorySlugs(
  slugs: string[],
  userId: string | null | undefined
): void {
  if (typeof window === 'undefined') return;
  if (!userId?.trim()) return;
  const storageKey = storageKeyForUser(userId);
  if (!storageKey) return;
  const next = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  notifyChanged(userId);
}

/** Returns new following state (true = now following). Signed-in users only. */
export function toggleFollowedCategorySlug(
  slug: string,
  userId: string | null | undefined
): boolean {
  if (!userId?.trim()) return false;
  const key = slug.trim().toLowerCase();
  if (!key) return false;
  const cur = readFollowedCategorySlugs(userId);
  const has = cur.includes(key);
  const next = has ? cur.filter((s) => s !== key) : [...cur, key];
  writeFollowedCategorySlugs(next, userId);
  return !has;
}

export function isCategorySlugFollowed(slug: string, userId: string | null | undefined): boolean {
  if (!userId?.trim()) return false;
  const key = slug.trim().toLowerCase();
  if (!key) return false;
  return readFollowedCategorySlugs(userId).includes(key);
}

export type CategoryFollowViewer = Readonly<{
  token: string | null | undefined;
  userId: string | null | undefined;
  isHydrated?: boolean;
}>;

/** Signed-in viewer with a stable user id — required before showing follow UI state. */
export function canSyncCategoryFollowState(viewer: CategoryFollowViewer): boolean {
  if (viewer.isHydrated === false) return false;
  return Boolean(viewer.token?.trim() && viewer.userId?.trim());
}

/** Whether the current viewer follows a category (never true when logged out). */
export function isCategoryFollowedForViewer(slug: string, viewer: CategoryFollowViewer): boolean {
  if (!canSyncCategoryFollowState(viewer)) return false;
  return isCategorySlugFollowed(slug, viewer.userId);
}

export function shouldHandleFollowedCategoriesEvent(
  event: Event,
  activeUserId: string | null | undefined
): boolean {
  if (!(event instanceof CustomEvent)) return true;
  const detail = event.detail as { userId?: string | null } | undefined;
  if (detail?.userId == null) return true;
  const active = activeUserId?.trim();
  if (!active) return false;
  return detail.userId === active;
}
