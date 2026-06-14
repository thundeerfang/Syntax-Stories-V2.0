import { diceBearSquadIconUrl } from "@/lib/core/diceBearAvatarUrl";
import { resolvePublicApiBase } from "@/lib/api/publicApiBase";

export function resolveSquadMediaUrl(
  url: string | null | undefined,
): string | undefined {
  const t = url?.trim();
  if (!t) return undefined;
  if (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("data:")
  ) {
    return t;
  }
  const base = resolvePublicApiBase().replace(/\/$/, "");
  return `${base}${t.startsWith("/") ? "" : "/"}${t}`;
}

export function resolveSquadIconUrl(
  iconUrl: string | undefined,
  slug: string,
): string {
  return resolveSquadMediaUrl(iconUrl) ?? diceBearSquadIconUrl(slug);
}
