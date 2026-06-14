const KEY = "syntax-stories-last-user";
export function setLastUserName(fullName: string): void {
  if (globalThis.window === undefined) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ fullName }));
  } catch {}
}
export function clearLastUser(): void {
  if (globalThis.window === undefined) return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
