/** Resolve profile/cover media paths for display and image export. */
export function resolveProfileMediaUrl(
  raw: string | undefined,
  username?: string,
): string {
  const trimmed = raw?.trim();
  const seed = username?.trim() || 'user';
  const dicebear = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  if (!trimmed) return dicebear;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}
