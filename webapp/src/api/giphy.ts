/**
 * Giphy API (client-side). Set NEXT_PUBLIC_GIPHY_API_KEY in .env.local.
 * Get a key: https://developers.giphy.com/dashboard/
 */

const GIPHY_BASE = 'https://api.giphy.com/v1';

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
  const key = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_GIPHY_API_KEY is not set. Add it to .env.local to enable GIF search.');
  }
  const params = new URLSearchParams({
    api_key: key,
    q: query.trim(),
    limit: String(options?.limit ?? 20),
    ...(options?.offset != null && { offset: String(options.offset) }),
  });
  const res = await fetch(`${GIPHY_BASE}/gifs/search?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? res.statusText);
  }
  return res.json() as Promise<GiphySearchResponse>;
}
