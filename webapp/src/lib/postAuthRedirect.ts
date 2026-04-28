const KEY = 'syntax-stories-post-auth-redirect';

/** Call before sending the user to `/login` (e.g. from `/invite` while logged out). */
export function setPostAuthRedirect(path: string): void {
  try {
    if (!path.startsWith('/') || path.startsWith('//')) return;
    globalThis.sessionStorage?.setItem(KEY, path);
  } catch {
    /* ignore */
  }
}

/**
 * After successful sign-in: if a path was stored, navigate there and return true.
 * Otherwise return false (caller may `router.replace('/')`).
 */
export function consumePostAuthRedirect(): boolean {
  try {
    const path = globalThis.sessionStorage?.getItem(KEY);
    globalThis.sessionStorage?.removeItem(KEY);
    if (!path || typeof path !== 'string') return false;
    if (!path.startsWith('/') || path.startsWith('//')) return false;
    globalThis.window?.location.assign(path);
    return true;
  } catch {
    return false;
  }
}
