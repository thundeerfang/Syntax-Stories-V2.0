import { blogAuthFetch } from "@/lib/api/blogAuthFetch";
import { resolvePublicApiBase } from "@/lib/api/publicApiBase";
import type {
  AchievementsListResponse,
  AchievementsSummaryResponse,
} from "@/contracts/achievementsApi";
async function readJson<T>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
function apiBase(): string {
  const base = resolvePublicApiBase();
  if (!base) {
    throw new Error("API URL is not configured (NEXT_PUBLIC_API_BASE_URL).");
  }
  return base;
}
export const achievementsApi = {
  list: async (accessToken: string): Promise<AchievementsListResponse> => {
    const r = await blogAuthFetch(
      `${apiBase()}/api/achievements`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as AchievementsListResponse & {
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      ...data,
      items: Array.isArray(data.items) ? data.items : [],
    };
  },
  summary: async (
    accessToken: string,
  ): Promise<AchievementsSummaryResponse> => {
    const r = await blogAuthFetch(
      `${apiBase()}/api/achievements/summary`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as AchievementsSummaryResponse & {
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data;
  },
};
export function achievementsStreamUrl(): string {
  const base = resolvePublicApiBase().replace(/\/$/, "");
  const path = "/api/achievements/stream";
  return base ? `${base}${path}` : path;
}
