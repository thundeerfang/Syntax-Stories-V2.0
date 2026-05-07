const K_ACCESS = 'syntax_stories_desktop_access';
const K_REFRESH = 'syntax_stories_desktop_refresh';

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(K_ACCESS);
  },
  getRefresh(): string | null {
    return localStorage.getItem(K_REFRESH);
  },
  setTokens(access: string, refresh?: string | null): void {
    localStorage.setItem(K_ACCESS, access);
    if (refresh) localStorage.setItem(K_REFRESH, refresh);
    else localStorage.removeItem(K_REFRESH);
  },
  clear(): void {
    localStorage.removeItem(K_ACCESS);
    localStorage.removeItem(K_REFRESH);
  },
};
