/**
 * Unsplash API (client-side). Set NEXT_PUBLIC_UNSPLASH_ACCESS_KEY in .env.local.
 * Get a key: https://unsplash.com/oauth/applications
 */

const UNSPLASH_BASE = 'https://api.unsplash.com';

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
  const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_UNSPLASH_ACCESS_KEY is not set. Add it to .env.local to enable Unsplash search.');
  }
  const params = new URLSearchParams({
    query: query.trim(),
    per_page: String(options?.per_page ?? 20),
    ...(options?.page != null && { page: String(options.page) }),
    client_id: key,
  });
  const res = await fetch(`${UNSPLASH_BASE}/search/photos?${params}`, {
    headers: { 'Accept-Version': 'v1' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray((err as { errors?: string[] }).errors)
      ? (err as { errors: string[] }).errors[0]
      : (err as { message?: string }).message ?? res.statusText;
    throw new Error(msg);
  }
  return res.json() as Promise<UnsplashSearchResponse>;
}
