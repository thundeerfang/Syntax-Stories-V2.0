/** Session-only target post for /blogs/write (no post id in the URL). */
export const WRITE_EDIT_POST_SESSION_KEY = 'syntax-stories-blog-write-target-post';

export function setWriteEditorSessionPostId(id: string | null): void {
  if (globalThis.window === undefined) return;
  try {
    if (id) globalThis.sessionStorage.setItem(WRITE_EDIT_POST_SESSION_KEY, id);
    else globalThis.sessionStorage.removeItem(WRITE_EDIT_POST_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function getWriteEditorSessionPostId(): string | null {
  if (globalThis.window === undefined) return null;
  try {
    return globalThis.sessionStorage.getItem(WRITE_EDIT_POST_SESSION_KEY);
  } catch {
    return null;
  }
}
