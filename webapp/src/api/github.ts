function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return base.replace(/\/$/, '');
}

export interface GithubRepoInfo {
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  owner: string;
  avatar_url: string | null;
}

export interface GithubRepoListItem {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  owner: { login: string; avatar_url?: string };
}

/** Parse GitHub repo URL to { owner, repo } or null. */
export function parseGithubRepoUrl(url: string): { owner: string; repo: string } | null {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (!/^(www\.)?github\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
    return null;
  } catch {
    return null;
  }
}

/** Fetch repo info by owner/repo (public API, no auth). */
export async function fetchRepoInfo(owner: string, repo: string): Promise<GithubRepoInfo> {
  const base = getApiBase();
  const r = await fetch(`${base}/api/github/repo-info/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  const data = (await r.json().catch(() => ({}))) as { success?: boolean; message?: string; repo?: GithubRepoInfo };
  if (!r.ok) throw new Error(data.message ?? 'Failed to fetch repo');
  if (!data.repo) throw new Error('Invalid response');
  return data.repo;
}

/** Fetch repo info from a GitHub URL. */
export async function fetchRepoByUrl(url: string): Promise<GithubRepoInfo> {
  const parsed = parseGithubRepoUrl(url);
  if (!parsed) throw new Error('Invalid GitHub repo URL');
  return fetchRepoInfo(parsed.owner, parsed.repo);
}

/** Fetch current user's repos (requires auth + GitHub linked). */
export async function fetchMyRepos(accessToken: string): Promise<GithubRepoListItem[]> {
  const base = getApiBase();
  const r = await fetch(`${base}/api/github/repos`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await r.json().catch(() => ({}))) as { success?: boolean; message?: string; repos?: GithubRepoListItem[] };
  if (!r.ok) throw new Error(data.message ?? 'Failed to fetch repos');
  return Array.isArray(data.repos) ? data.repos : [];
}
