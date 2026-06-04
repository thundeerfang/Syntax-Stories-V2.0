import { normalizeUserRef } from './normalizeUserRef';

/** Admin user profile URL using opaque server-issued ref (not raw ObjectId). */
export function userProfilePath(ref: string, tab?: string): string {
  const canonical = normalizeUserRef(ref);
  const base = `/users/${encodeURIComponent(canonical)}`;
  if (!tab || tab === 'overview') return base;
  return `${base}?tab=${encodeURIComponent(tab)}`;
}

export function isLikelyObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value.trim());
}

/** Admin blog detail page (global blogs section). */
export function blogDetailPath(postId: string): string {
  return `/blogs/${encodeURIComponent(postId)}`;
}
