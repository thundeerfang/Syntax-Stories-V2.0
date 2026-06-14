import { env } from "../../config/env.js";
import { consumeSearchRateLimit } from "../search/searchRateLimit.service.js";
const GIPHY_BASE = "https://api.giphy.com/v1";
export type GiphyGifDto = {
  id: string;
  title: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    original: {
      url: string;
    };
  };
};
export type GiphySearchResult = {
  data: GiphyGifDto[];
  pagination?: {
    total_count: number;
    count: number;
    offset: number;
  };
};
function parseLimit(raw: unknown, fallback = 20): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, 1), 50);
}
function parseOffset(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, 4999);
}
export function isGiphyConfigured(): boolean {
  return Boolean(env.GIPHY_API_KEY?.trim());
}
export async function searchGiphyGifs(input: {
  query: string;
  limit?: unknown;
  offset?: unknown;
  ipHash: string;
}): Promise<
  | {
      ok: true;
      result: GiphySearchResult;
    }
  | {
      ok: false;
      status: 400 | 429 | 503 | 502;
      message: string;
    }
> {
  const q = input.query.trim();
  if (!q) {
    return { ok: false, status: 400, message: "Query is required." };
  }
  const key = env.GIPHY_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      status: 503,
      message: "GIF search is not configured on the server (GIPHY_API_KEY).",
    };
  }
  const allowed = await consumeSearchRateLimit(input.ipHash);
  if (!allowed) {
    return {
      ok: false,
      status: 429,
      message: "Too many search requests. Try again soon.",
    };
  }
  const limit = parseLimit(input.limit);
  const offset = parseOffset(input.offset);
  const params = new URLSearchParams({
    api_key: key,
    q,
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`${GIPHY_BASE}/gifs/search?${params}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string;
    };
    return {
      ok: false,
      status: 502,
      message: err.message?.trim() || "GIF search failed.",
    };
  }
  const body = (await res.json()) as GiphySearchResult;
  return { ok: true, result: body };
}
