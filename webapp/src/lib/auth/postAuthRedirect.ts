const KEY = "syntax-stories-post-auth-redirect";
export function setPostAuthRedirect(path: string): void {
  try {
    if (!path.startsWith("/") || path.startsWith("//")) return;
    globalThis.sessionStorage?.setItem(KEY, path);
  } catch {}
}
export function consumePostAuthRedirect(): boolean {
  try {
    const path = globalThis.sessionStorage?.getItem(KEY);
    globalThis.sessionStorage?.removeItem(KEY);
    if (!path || typeof path !== "string") return false;
    if (!path.startsWith("/") || path.startsWith("//")) return false;
    globalThis.window?.location.assign(path);
    return true;
  } catch {
    return false;
  }
}
