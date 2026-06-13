/** Legacy schema / OAuth placeholder — not shown as a real user-written bio. */
export const DEFAULT_PROFILE_BIO =
  'Welcome to Syntax Stories 🧑🏻‍💻, you can add your bio you want..🚀';

const PLACEHOLDER_PROFILE_BIOS = new Set([
  DEFAULT_PROFILE_BIO,
  'Welcome to Syntax Stories 🧑🏻‍💻',
]);

export function isPlaceholderProfileBio(bio: unknown): boolean {
  if (typeof bio !== 'string') return true;
  const t = bio.trim();
  return t.length === 0 || PLACEHOLDER_PROFILE_BIOS.has(t);
}

/** Normalize stored bio for API responses and profile display. */
export function normalizeProfileBio(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  if (isPlaceholderProfileBio(raw)) return undefined;
  return raw;
}
