/**
 * Unsplash photo search via Syntax Stories API (access key stays on the server).
 */
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';

export interface UnsplashPhoto {
  id: string;
  urls: { raw: string; full: string; regular: string; small: string; thumb: string };
  user: { name: string; username: string; links?: { html: string } };
  alt_description?: string | null;
}

export interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
}

export async function searchUnsplashPhotos(
  query: string,
  options?: { per_page?: number; page?: number }
): Promise<UnsplashSearchResponse> {
  const q = query.trim();
  if (!q) {
    return { results: [], total: 0, total_pages: 0 };
  }

  const params = new URLSearchParams({
    q,
    per_page: String(options?.per_page ?? 20),
    ...(options?.page != null && { page: String(options.page) }),
  });

  const base = resolvePublicApiBase().replace(/\/$/, '');
  const res = await fetch(`${base}/api/media/unsplash/search?${params}`);
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    results?: UnsplashPhoto[];
    total?: number;
    total_pages?: number;
  };

  if (!res.ok || body.success !== true) {
    throw new Error(body.message ?? res.statusText ?? 'Unsplash search failed');
  }

  return {
    results: body.results ?? [],
    total: body.total ?? 0,
    total_pages: body.total_pages ?? 0,
  };
}
