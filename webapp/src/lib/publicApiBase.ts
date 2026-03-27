/**
 * Browser-safe API origin: uses NEXT_PUBLIC_API_BASE_URL when set (including empty string);
 * otherwise same-origin in the browser, or '' during SSR.
 */
export function resolvePublicApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (env !== undefined && env !== null) {
    return env.replace(/\/$/, '');
  }
  if (globalThis.window === undefined) {
    return '';
  }
  return globalThis.window.location.origin.replace(/\/$/, '');
}

/** Relative fetch in browser; absolute base from env on the server (Next RSC / SSR). */
export function resolveFetchBaseForApiClient(): string {
  if (globalThis.window === undefined) {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  }
  return '';
}

/** Absolute URL for client-side same-origin paths or env-prefixed server fetches. */
export function resolveSameOriginRequestUrl(path: string): string {
  if (path.startsWith('http')) {
    return path;
  }
  if (globalThis.window === undefined) {
    return `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${path}`;
  }
  return `${globalThis.window.location.origin}${path}`;
}
