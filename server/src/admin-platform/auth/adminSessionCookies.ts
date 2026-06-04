import type { Response } from 'express';
import { env } from '../../config/env.js';

export const ADMIN_ACCESS_COOKIE = 'ss_admin_at';
export const ADMIN_REFRESH_COOKIE = 'ss_admin_rt';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function cookieBaseOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  domain?: string;
} {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    ...(env.ADMIN_COOKIE_DOMAIN ? { domain: env.ADMIN_COOKIE_DOMAIN } : {}),
  };
}

export function setAdminSessionCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
): void {
  if (!env.FEATURE_ADMIN_HTTPONLY_COOKIES) return;
  const base = cookieBaseOptions();
  res.cookie(ADMIN_ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: SEVEN_DAYS_MS,
  });
  res.cookie(ADMIN_REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: SEVEN_DAYS_MS,
  });
}

export function clearAdminSessionCookies(res: Response): void {
  if (!env.FEATURE_ADMIN_HTTPONLY_COOKIES) return;
  const base = cookieBaseOptions();
  res.clearCookie(ADMIN_ACCESS_COOKIE, base);
  res.clearCookie(ADMIN_REFRESH_COOKIE, base);
}

export function readAdminAccessToken(cookies: Record<string, string | undefined>): string | null {
  const v = cookies[ADMIN_ACCESS_COOKIE];
  return v?.trim() ? v : null;
}

export function readAdminRefreshToken(cookies: Record<string, string | undefined>): string | null {
  const v = cookies[ADMIN_REFRESH_COOKIE];
  return v?.trim() ? v : null;
}
