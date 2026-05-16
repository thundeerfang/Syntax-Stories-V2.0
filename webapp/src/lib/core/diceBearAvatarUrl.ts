/** DiceBear avatar URL with transparent background (for circular avatar chips). */
export function diceBearAvatarUrl(
  seed: string,
  style: 'avataaars' | 'initials' = 'avataaars',
): string {
  const params = new URLSearchParams({
    seed: seed.trim() || 'user',
    backgroundColor: 'transparent',
  });
  return `https://api.dicebear.com/7.x/${style}/svg?${params.toString()}`;
}

/** Stored profile images are often DiceBear SVG data URIs with an opaque background. */
export function isDiceBearStoredProfile(raw: string | undefined): boolean {
  const t = raw?.trim() ?? '';
  if (!t) return false;
  if (t.startsWith('data:image/svg+xml')) return true;
  return t.includes('dicebear.com');
}
