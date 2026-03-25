const OAUTH_LEFT_KEY = 'ss_oauth_pending';

/** Fired when the user starts same-tab OAuth so the app can hide route loaders (they are not waiting on our server). */
export const OAUTH_LEAVING_EVENT = 'ss-oauth-leaving';

/** Call before navigating to the API `/auth/*` OAuth start URL (same-tab). */
export function markOAuthNavigationPending(): void {
  try {
    sessionStorage.setItem(OAUTH_LEFT_KEY, '1');
  } catch {
    /* ignore private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OAUTH_LEAVING_EVENT));
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
