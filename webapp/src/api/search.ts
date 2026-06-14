import { blogPublicFetch } from "@/lib/api/blogAuthFetch";
import { resolvePublicApiBase } from "@/lib/api/publicApiBase";
import type { FollowUser } from "@contracts/followApi";
import type {
  EntityOption,
  ReferenceEntityKind,
  TechStackItem,
} from "@contracts/referenceApi";
import type {
  SearchGroupKey,
  SearchHit,
  UnifiedSearchResponse,
} from "@contracts/searchApi";
import {
  resolveTechStackApi,
  searchReferenceEntitiesApi,
  searchTechStackApi,
} from "@/api/reference";
const getApiBase = () => resolvePublicApiBase();
async function readJson<T>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
export type { SearchHit, UnifiedSearchResponse } from "@contracts/searchApi";
export type {
  EntityOption,
  TechStackItem,
  TechStackCategory,
} from "@contracts/referenceApi";
function usernameFromHit(hit: SearchHit): string {
  const fromSub = hit.sublabel?.replace(/^@/, "").trim();
  if (fromSub) return fromSub;
  const m = hit.href.match(/^\/u\/([^/?#]+)/);
  return m?.[1] ?? "";
}
function hitToFollowUser(hit: SearchHit): FollowUser | null {
  const username = usernameFromHit(hit);
  if (!username) return null;
  return {
    id: hit.id,
    username,
    fullName: hit.label,
    profileImg: hit.imageUrl,
  };
}
export const searchApi = {
  unified: async (
    q: string,
    opts?: {
      types?: SearchGroupKey[] | "all";
      limit?: number;
      context?: "default" | "mention";
    },
  ): Promise<UnifiedSearchResponse> => {
    const sp = new URLSearchParams();
    sp.set("q", q.trim());
    if (opts?.types && opts.types !== "all") {
      sp.set("types", opts.types.join(","));
    }
    if (opts?.limit != null) sp.set("limit", String(opts.limit));
    if (opts?.context === "mention") sp.set("context", "mention");
    const r = await blogPublicFetch(
      `${getApiBase()}/api/search?${sp.toString()}`,
    );
    const data = (await readJson(r)) as UnifiedSearchResponse & {
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: true,
      q: data.q ?? q.trim(),
      minChars: data.minChars ?? 3,
      cached: data.cached,
      tookMs: data.tookMs,
      groups: data.groups ?? {},
    };
  },
  searchUsers: async (q: string, limit = 10): Promise<FollowUser[]> => {
    const query = q.trim();
    if (!query) return [];
    const res = await searchApi.unified(query, {
      types: ["users"],
      limit,
      context: "mention",
    });
    const hits = res.groups.users ?? [];
    return hits.map(hitToFollowUser).filter((u): u is FollowUser => u != null);
  },
  searchOrganizations: (query: string, limit = 15): Promise<EntityOption[]> =>
    searchReferenceEntitiesApi("organization", query, limit),
  searchTechStack: (query: string, limit = 15): Promise<TechStackItem[]> =>
    searchTechStackApi(query, limit),
  resolveTechStack: (names: string[]): Promise<TechStackItem[]> =>
    resolveTechStackApi(names),
  searchReferenceEntities: (
    kind: ReferenceEntityKind,
    query: string,
    limit = 15,
  ): Promise<EntityOption[]> => searchReferenceEntitiesApi(kind, query, limit),
};
