const KEY = 'syntax-stories-last-user';



export function setLastUserName(fullName: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ fullName }));
  } catch {
    /* ignore */
  }
}

export function clearLastUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
