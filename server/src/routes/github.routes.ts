import { Router, Request, Response } from 'express';
import { verifyToken, type AuthUser } from '../middlewares/auth';
import { UserModel } from '../models/User';

const router = Router();

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  owner: { login: string; avatar_url?: string };
  archived?: boolean;
  fork?: boolean;
};

/** Public: fetch repo info by owner/repo (no auth). For blog block URL paste. */
router.get('/repo-info/:owner/:repo', async (req: Request, res: Response) => {
  try {
    const owner = encodeURIComponent(String(req.params.owner || '').trim());
    const repo = encodeURIComponent(String(req.params.repo || '').trim());
    if (!owner || !repo) {
      res.status(400).json({ success: false, message: 'Invalid owner or repo.' });
      return;
    }
    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!ghRes.ok) {
      const text = await ghRes.text().catch(() => '');
      res.status(ghRes.status).json({ success: false, message: 'Repo not found or not public.', detail: text });
      return;
    }
    const repoData = (await ghRes.json()) as GitHubRepo;
    res.json({
      success: true,
      repo: {
        name: repoData.name,
        full_name: repoData.full_name,
        html_url: repoData.html_url,
        description: repoData.description ?? '',
        owner: repoData.owner?.login ?? '',
        avatar_url: repoData.owner?.avatar_url ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Server error' });
  }
});

function monthYearFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

async function getGithubToken(userId: string): Promise<string | null> {
  const u = await UserModel.findById(userId).select('+githubToken isGitAccount githubToken');
  if (!u || !u.isGitAccount) return null;
  return (u.githubToken ?? null) as string | null;
}

router.get('/repos', verifyToken, async (req: Request, res: Response) => {
  try {
    const authUser = (req as Request & { user: AuthUser }).user;
    const token = await getGithubToken(authUser._id);
    if (!token) {
      res.status(400).json({ success: false, message: 'GitHub is not connected.' });
      return;
    }

    const ghRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&visibility=public&affiliation=owner', {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!ghRes.ok) {
      const text = await ghRes.text().catch(() => '');
      res.status(ghRes.status).json({ success: false, message: 'Failed to fetch repos from GitHub.', detail: text });
      return;
    }
    const repos = (await ghRes.json()) as GitHubRepo[];
    const cleaned = (Array.isArray(repos) ? repos : []).filter((r) => r && !r.archived);
    res.json({ success: true, repos: cleaned });
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Server error' });
  }
});

router.get('/repo/:fullName', verifyToken, async (req: Request, res: Response) => {
  try {
    const authUser = (req as Request & { user: AuthUser }).user;
    const token = await getGithubToken(authUser._id);
    if (!token) {
      res.status(400).json({ success: false, message: 'GitHub is not connected.' });
      return;
    }
    const fullName = String(req.params.fullName || '').trim();
    if (!fullName || !fullName.includes('/')) {
      res.status(400).json({ success: false, message: 'Invalid repo name.' });
      return;
    }
    const [ownerRaw, repoRaw] = fullName.split('/');
    const owner = encodeURIComponent(ownerRaw);
    const repoName = encodeURIComponent(repoRaw);

    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!ghRes.ok) {
      const text = await ghRes.text().catch(() => '');
      res.status(ghRes.status).json({ success: false, message: 'Failed to fetch repo from GitHub.', detail: text });
      return;
    }
    const repo = (await ghRes.json()) as GitHubRepo;
    res.json({
      success: true,
      project: {
        type: 'project',
        source: 'github',
        repoFullName: repo.full_name,
        repoId: repo.id,
        title: repo.name,
        publisher: repo.owner?.login,
        ongoing: false,
        publicationDate: monthYearFromIso(repo.created_at) || monthYearFromIso(repo.updated_at),
        endDate: undefined,
        publicationUrl: repo.html_url,
        description: repo.description ?? '',
        media: [],
      },
      repo,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Server error' });
  }
});

export default router;

