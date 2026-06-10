/**
 * Giphy GIF search via Syntax Stories API (keys stay on the server).
 */
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';

export interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height: { url: string; width: string; height: string };
    original: { url: string };
  };
}

export interface GiphySearchResponse {
  data: GiphyGif[];
  pagination?: { total_count: number; count: number; offset: number };
}

export async function searchGifs(
  query: string,
  options?: { limit?: number; offset?: number }
): Promise<GiphySearchResponse> {
  const q = query.trim();
  if (!q) {
    return { data: [] };
  }

  const params = new URLSearchParams({
    q,
    limit: String(options?.limit ?? 20),
    ...(options?.offset != null && { offset: String(options.offset) }),
  });

  const base = resolvePublicApiBase().replace(/\/$/, '');
  const res = await fetch(`${base}/api/media/giphy/search?${params}`);
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: GiphyGif[];
    pagination?: GiphySearchResponse['pagination'];
  };

  if (!res.ok || body.success !== true) {
    throw new Error(body.message ?? res.statusText ?? 'GIF search failed');
  }

  return {
    data: body.data ?? [],
    pagination: body.pagination,
  };
}
