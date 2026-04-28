import { Router } from 'express';
import { verifyToken } from '../middlewares/auth/index.js';
import { UserModel } from '../models/User.js';
import { unsealProviderToken } from '../shared/crypto/providerTokenCrypto.js';
const router = Router();
/** Public: fetch repo info by owner/repo (no auth). For blog block URL paste. */
router.get('/repo-info/:owner/:repo', async (req, res) => {
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
        const repoData = (await ghRes.json());
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
    }
    catch (err) {
        res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Server error' });
    }
});
function monthYearFromIso(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return '';
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
}
async function getGithubToken(userId) {
    const u = await UserModel.findById(userId).select('+githubToken isGitAccount githubToken');
    if (!u || !u.isGitAccount)
        return null;
    const raw = u.githubToken;
    if (raw == null || raw === '')
        return null;
    return unsealProviderToken(raw) ?? null;
}
router.get('/repos', verifyToken, async (req, res) => {
    try {
        const authUser = req.user;
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
        const repos = (await ghRes.json());
        const cleaned = (Array.isArray(repos) ? repos : []).filter((r) => r && !r.archived);
        res.json({ success: true, repos: cleaned });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Server error' });
    }
});
router.get('/repo/:fullName', verifyToken, async (req, res) => {
    try {
        const authUser = req.user;
        const token = await getGithubToken(authUser._id);
        if (!token) {
            res.status(400).json({ success: false, message: 'GitHub is not connected.' });
            return;
        }
        const fullName = String(req.params.fullName || '').trim();
        if (!fullName?.includes('/')) {
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
        const repo = (await ghRes.json());
        res.json({
            success: true,
            project: projectFromGithubRepo(repo),
            repo,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Server error' });
    }
});
function projectFromGithubRepo(repo) {
    return {
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
    };
}
/** Batch-fetch GitHub repos and return project payloads (one round-trip from the browser vs N GETs). */
router.post('/repos/import-batch', verifyToken, async (req, res) => {
    try {
        const authUser = req.user;
        const token = await getGithubToken(authUser._id);
        if (!token) {
            res.status(400).json({ success: false, message: 'GitHub is not connected.' });
            return;
        }
        const raw = req.body?.fullNames;
        if (!Array.isArray(raw) || raw.length === 0) {
            res.status(400).json({ success: false, message: 'Provide fullNames: non-empty string[].' });
            return;
        }
        if (raw.length > 15) {
            res.status(400).json({ success: false, message: 'At most 15 repositories per request.' });
            return;
        }
        const fullNames = raw.map((s) => String(s ?? '').trim()).filter((s) => s.length > 0);
        if (fullNames.length === 0) {
            res.status(400).json({ success: false, message: 'No valid repo names.' });
            return;
        }
        const seenLower = new Set();
        const deduped = [];
        const failed = [];
        for (const fullName of fullNames) {
            const key = fullName.toLowerCase();
            if (seenLower.has(key)) {
                failed.push({
                    fullName,
                    message: 'Duplicate in request: same repository listed more than once.',
                });
                continue;
            }
            seenLower.add(key);
            deduped.push(fullName);
        }
        const projects = [];
        for (const fullName of deduped) {
            if (!fullName.includes('/')) {
                failed.push({ fullName, message: 'Invalid repo name.' });
                continue;
            }
            const [ownerRaw, repoRaw] = fullName.split('/');
            const owner = encodeURIComponent(ownerRaw);
            const repoName = encodeURIComponent(repoRaw);
            try {
                const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
                    headers: {
                        Authorization: `token ${token}`,
                        Accept: 'application/vnd.github+json',
                    },
                });
                if (!ghRes.ok) {
                    const text = await ghRes.text().catch(() => '');
                    failed.push({ fullName, message: text || `HTTP ${ghRes.status}` });
                    continue;
                }
                const repo = (await ghRes.json());
                if (repo.archived) {
                    failed.push({ fullName, message: 'Archived repository skipped.' });
                    continue;
                }
                projects.push(projectFromGithubRepo(repo));
            }
            catch (e) {
                failed.push({
                    fullName,
                    message: e instanceof Error ? e.message : 'Request failed',
                });
            }
        }
        res.json({
            success: true,
            projects,
            failed,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Server error' });
    }
});
export default router;
//# sourceMappingURL=github.routes.js.map