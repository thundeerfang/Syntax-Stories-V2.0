import { env } from '../../config/env.js';
import { consumeSearchRateLimit } from '../search/searchRateLimit.service.js';

const UNSPLASH_BASE = 'https://api.unsplash.com';

export type UnsplashPhotoDto = {
  id: string;
  urls: { raw: string; full: string; regular: string; small: string; thumb: string };
  user: { name: string; username: string; links?: { html: string } };
  alt_description?: string | null;
};

export type UnsplashSearchResult = {
  results: UnsplashPhotoDto[];
  total: number;
  total_pages: number;
};

function parsePerPage(raw: unknown, fallback = 20): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, 1), 30);
}

function parsePage(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(n, 100);
}

export function isUnsplashConfigured(): boolean {
  return Boolean(env.UNSPLASH_ACCESS_KEY?.trim());
}

/** Proxy Unsplash photo search — access key stays on the server. */
export async function searchUnsplashPhotos(input: {
  query: string;
  perPage?: unknown;
  page?: unknown;
  ipHash: string;
}): Promise<
  | { ok: true; result: UnsplashSearchResult }
  | { ok: false; status: 400 | 429 | 503 | 502; message: string }
> {
  const q = input.query.trim();
  if (!q) {
    return { ok: false, status: 400, message: 'Query is required.' };
  }

  const key = env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      status: 503,
      message: 'Unsplash search is not configured on the server (UNSPLASH_ACCESS_KEY).',
    };
  }

  const allowed = await consumeSearchRateLimit(input.ipHash);
  if (!allowed) {
    return { ok: false, status: 429, message: 'Too many search requests. Try again soon.' };
  }

  const perPage = parsePerPage(input.perPage);
  const page = parsePage(input.page);
  const params = new URLSearchParams({
    query: q,
    per_page: String(perPage),
    page: String(page),
    client_id: key,
  });

  const res = await fetch(`${UNSPLASH_BASE}/search/photos?${params}`, {
    headers: { 'Accept-Version': 'v1' },
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { errors?: string[]; message?: string };
    const msg = Array.isArray(err.errors) ? err.errors[0] : err.message;
    return {
      ok: false,
      status: 502,
      message: msg?.trim() || 'Unsplash search failed.',
    };
  }

  const body = (await res.json()) as UnsplashSearchResult;
  return { ok: true, result: body };
}
