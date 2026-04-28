import { env } from './env.js';

/** First `FRONTEND_URL` entry — OAuth redirects and similar. */
export function getFrontendRedirectBase(): string {
  return (env.FRONTEND_URL ?? '').split(',')[0]?.trim() ?? (env.FRONTEND_URL ?? '');
}

/** Comma-separated production frontends for CORS. */
export function getProductionAllowedOrigins(): string[] {
  return (env.FRONTEND_URL ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  if (!allowedOrigins.length) return false;
  const originHost = (() => {
    try {
      return new URL(origin).hostname;
    } catch {
      return origin;
    }
  })();
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1);
      if (originHost === suffix.slice(1) || originHost.endsWith(suffix)) return true;
    } else if (origin === allowed) return true;
  }
  return false;
}
