import {
  diceBearAvatarUrl,
  isDiceBearStoredProfile,
} from "@/lib/core/diceBearAvatarUrl";
import { resolvePublicApiBase } from "@/lib/api/publicApiBase";

export type ResolveProfileMediaUrlOptions = Readonly<{
  fallbackSeed?: string;
}>;

export function resolveProfileMediaUrl(
  raw: string | undefined,
  seed?: string,
  options?: ResolveProfileMediaUrlOptions,
): string {
  const trimmed = raw?.trim();
  const handle = seed?.trim() || options?.fallbackSeed || "user";

  if (!trimmed || isDiceBearStoredProfile(trimmed)) {
    return diceBearAvatarUrl(handle);
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (isDiceBearStoredProfile(trimmed)) {
      return diceBearAvatarUrl(handle);
    }
    return trimmed;
  }
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }
  const base = resolvePublicApiBase().replace(/\/$/, "");
  return `${base}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}
