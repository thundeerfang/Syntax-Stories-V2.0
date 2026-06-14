const OAUTH_LEFT_KEY = "ss_oauth_pending";
export const OAUTH_LEAVING_EVENT = "ss-oauth-leaving";
export function isOAuthBrowserCallbackPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/auth/callback")) return true;
  return pathname.includes("-callback");
}
export function markOAuthNavigationPending(): void {
  try {
    sessionStorage.setItem(OAUTH_LEFT_KEY, "1");
  } catch {}
  if (globalThis.window !== undefined) {
    globalThis.dispatchEvent(new CustomEvent(OAUTH_LEAVING_EVENT));
  }
}
export function consumeOAuthNavigationPending(): boolean {
  try {
    if (sessionStorage.getItem(OAUTH_LEFT_KEY) !== "1") return false;
    sessionStorage.removeItem(OAUTH_LEFT_KEY);
    return true;
  } catch {
    return false;
  }
}
