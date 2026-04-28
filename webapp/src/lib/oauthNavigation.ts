const OAUTH_LEFT_KEY = 'ss_oauth_pending';

/** Fired when the user starts same-tab OAuth so the app can hide route loaders (they are not waiting on our server). */
export const OAUTH_LEAVING_EVENT = 'ss-oauth-leaving';

/**
 * OAuth return URL in the browser: `/auth/callback/{provider}` (and legacy `*-callback` paths).
 * Used so the shell / root loading do not show a full-screen terminal, then hand off to the callback page’s inline loader (avoids a visible “shrink”).
 */
export function isOAuthBrowserCallbackPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/auth/callback')) return true;
  return pathname.includes('-callback');
}

/** Call before navigating to the API `/auth/*` OAuth start URL (same-tab). */
export function markOAuthNavigationPending(): void {
  try {
    sessionStorage.setItem(OAUTH_LEFT_KEY, '1');
  } catch {
    /* ignore private mode */
  }
  if (globalThis.window !== undefined) {
    globalThis.dispatchEvent(new CustomEvent(OAUTH_LEAVING_EVENT));
  }
}

/** True once if the user had left for OAuth (e.g. back button or redirect return); clears the flag. */
export function consumeOAuthNavigationPending(): boolean {
  try {
    if (sessionStorage.getItem(OAUTH_LEFT_KEY) !== '1') return false;
    sessionStorage.removeItem(OAUTH_LEFT_KEY);
    return true;
  } catch {
    return false;
  }
}
