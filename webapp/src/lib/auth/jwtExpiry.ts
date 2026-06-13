/** Decode JWT `exp` (seconds) without verifying signature — client-side refresh scheduling only. */
export function getJwtExpMs(accessToken: string): number | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: number;
    };
    if (typeof payload.exp !== 'number') return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

/** Refresh access token this many ms before JWT expiry. */
export const PROACTIVE_REFRESH_LEAD_MS = 5 * 60 * 1000;

/** True when there is no usable access token or it expires within the lead window. */
export function accessTokenNeedsRefresh(accessToken: string | null | undefined): boolean {
  if (!accessToken?.trim()) return true;
  const expMs = getJwtExpMs(accessToken);
  if (!expMs) return true;
  return Date.now() >= expMs - PROACTIVE_REFRESH_LEAD_MS;
}
