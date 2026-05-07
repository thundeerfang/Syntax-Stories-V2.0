/**
 * Bounded wait for CMS/API fetches during `next build` static generation.
 * Without this, a TCP hang (no RST) can exceed Vercel’s ~60s per-page static render budget.
 */
export const PUBLIC_API_FETCH_TIMEOUT_MS = 12_000;

export function publicApiAbortSignal(): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(PUBLIC_API_FETCH_TIMEOUT_MS);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), PUBLIC_API_FETCH_TIMEOUT_MS);
  return c.signal;
}
