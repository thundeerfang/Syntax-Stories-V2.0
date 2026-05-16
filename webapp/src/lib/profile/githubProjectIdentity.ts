/**
 * Client helpers aligned with `docs/GITHUB_PROJECT_IMPORT_CONTRACT.md`.
 * Uniqueness for GitHub-sourced projects is by **`repoFullName`** (case-insensitive), with **`publicationUrl`**
 * as a secondary check for the same logical repo.
 */

export function normalizeGithubRepoFullName(fullName: string): string {
  return fullName
    .trim()
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('/');
}

/** Normalized compare URL: `https://github.com/owner/repo` (lowercase path). */
export function githubRepoPublicationUrl(fullName: string): string {
  const n = normalizeGithubRepoFullName(fullName);
  const parts = n.split('/');
  const path = parts.map((s) => s.toLowerCase()).join('/');
  return `https://github.com/${path}`;
}

export function projectMatchesGithubRepo(project: unknown, fullName: string): boolean {
  const want = normalizeGithubRepoFullName(fullName).toLowerCase();
  if (!want.includes('/')) return false;
  const p = project as { source?: string; repoFullName?: string; publicationUrl?: string };
  if (p.source !== 'github') return false;
  if (typeof p.repoFullName === 'string' && normalizeGithubRepoFullName(p.repoFullName).toLowerCase() === want) {
    return true;
  }
  if (typeof p.publicationUrl === 'string') {
    const u = p.publicationUrl.trim().toLowerCase().replace(/\/+$/, '');
    return u === githubRepoPublicationUrl(fullName).toLowerCase();
  }
  return false;
}
