import { getApiOrigin } from '@/lib/api';
import { diceBearAvatarUrl, isDiceBearStoredProfile } from '@/lib/users/diceBearAvatarUrl';

/** Resolve stored profile image paths for admin display (matches webapp behavior). */
export function resolveProfileMediaUrl(
  raw: string | null | undefined,
  username: string
): string {
  const trimmed = raw?.trim();
  const handle = username.trim() || 'user';

  if (!trimmed || isDiceBearStoredProfile(trimmed)) {
    return diceBearAvatarUrl(handle);
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (isDiceBearStoredProfile(trimmed)) {
      return diceBearAvatarUrl(handle);
    }
    return trimmed;
  }

  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  const base = getApiOrigin().replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return base ? `${base}${path}` : path;
}
