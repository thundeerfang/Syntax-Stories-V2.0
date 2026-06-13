/** Whether the admin client has an active session (Bearer or httpOnly cookies). */
export function isAdminAuthActive(token: string | null, httpOnlyCookies: boolean): boolean {
  return httpOnlyCookies || Boolean(token);
}

/** API token for Authorization header; null when session is cookie-only. */
export function resolveAdminApiToken(
  token: string | null,
  httpOnlyCookies: boolean
): string | null {
  return httpOnlyCookies ? null : token;
}
