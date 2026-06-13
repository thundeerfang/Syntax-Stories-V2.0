/**
 * GitHub proxy JSON API — `/api/github/*`.
 * Keep in sync with `server/src/routes/github.routes.ts`.
 */

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

export interface GithubReposListResponse {
  success: boolean;
  repos: GithubRepoListItem[];
}

export interface GithubImportBatchBody {
  repoFullNames: string[];
}
