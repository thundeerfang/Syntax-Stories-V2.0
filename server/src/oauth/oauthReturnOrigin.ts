import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import {
  getFrontendRedirectBase,
  getProductionAllowedOrigins,
} from '../config/frontendUrl.js';
import { OAUTH_RETURN_COOKIE_MAX_MS } from '../variable/constants.js';

const COOKIE_NAME = 'ss_oauth_return';
const DESKTOP_OAUTH_SCHEME = 'syntaxstories:';
const DESKTOP_OAUTH_HOST = 'app';

function isDesktopOAuthReturnOrigin(parsed: URL): boolean {
  return parsed.protocol === DESKTOP_OAUTH_SCHEME && parsed.hostname === DESKTOP_OAUTH_HOST;
}

/** Validate `frontendOrigin` query param (desktop shell passes its webapp origin). */
export function parseValidOAuthReturnOrigin(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = new URL(raw.trim());
    if (isDesktopOAuthReturnOrigin(parsed)) {
      return `${parsed.protocol}//${parsed.hostname}`;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const origin = parsed.origin;
    if (getProductionAllowedOrigins().includes(origin)) return origin;
    if (env.NODE_ENV === 'development') {
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return origin;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function setOAuthReturnOriginCookie(res: Response, origin: string): void {
  res.cookie(COOKIE_NAME, origin, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: OAUTH_RETURN_COOKIE_MAX_MS,
    path: '/',
  });
}

function readOAuthReturnOriginCookie(req: Request): string | null {
  const raw = req.cookies?.[COOKIE_NAME];
  return parseValidOAuthReturnOrigin(raw);
}

function clearOAuthReturnOriginCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** Persist desktop/browser return origin before redirecting to the OAuth provider. */
export function attachOAuthReturnOrigin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const origin = parseValidOAuthReturnOrigin(req.query.frontendOrigin);
  if (origin) setOAuthReturnOriginCookie(res, origin);
  next();
}

/** OAuth callback/error redirect base — prefers cookie set at OAuth start, else FRONTEND_URL. */
export function resolveOAuthRedirectBase(req: Request, res: Response): string {
  const fromCookie = readOAuthReturnOriginCookie(req);
  if (fromCookie) {
    clearOAuthReturnOriginCookie(res);
    return fromCookie;
  }
  return getFrontendRedirectBase();
}
