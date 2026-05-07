import type { Request, Response } from 'express';
import type { AuthUser } from '../../middlewares/auth/index.js';
import { isAdminRequest } from '../help/requireStaff.middleware.js';
import type { StaffRole } from '../help/requireStaff.middleware.js';
import {
  listBlogTrash,
  listUserTrash,
  restoreBlogPostAsAdmin,
  restoreHelpFromTrash,
  restoreUserAsAdmin,
  TrashServiceError,
} from './trash.service.js';
import { HelpServiceError, helpService } from '../help/help.service.js';

function sendTrashError(res: Response, err: unknown): void {
  if (err instanceof TrashServiceError) {
    res.status(err.status).json({ success: false, message: err.message, code: err.code });
    return;
  }
  if (err instanceof HelpServiceError) {
    res.status(err.status).json({ success: false, message: err.message, code: err.code });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

type TrashSection = 'help' | 'blog' | 'user';

function parseSections(raw: unknown): TrashSection[] {
  const all: TrashSection[] = ['help', 'blog', 'user'];
  if (raw == null || raw === '') return all;
  const s = String(raw);
  const parts = s
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const set = new Set<TrashSection>();
  for (const p of parts) {
    if (p === 'help' || p === 'blog' || p === 'user') set.add(p);
  }
  return set.size ? [...set] : all;
}

export async function getTrash(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(req.query.pageSize ?? '20'), 10) || 20));
    const sections = parseSections(req.query.sections);

    const out: Record<string, unknown> = { page, pageSize };

    if (sections.includes('help')) {
      out.help = await helpService.listTrash(page, pageSize);
    }
    if (sections.includes('blog')) {
      out.blog = await listBlogTrash(page, pageSize);
    }
    if (sections.includes('user')) {
      out.users = await listUserTrash(page, pageSize);
    }

    res.json({ success: true, ...out });
  } catch (err) {
    sendTrashError(res, err);
  }
}

export async function postRestore(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const staffRole = (req as Request & { staffRole: StaffRole }).staffRole;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const body = req.body as { resourceType?: string; id?: string };
    const resourceType = body.resourceType?.toLowerCase();
    const id = body.id?.trim();

    if (!resourceType || !id) {
      res.status(400).json({ success: false, message: 'resourceType and id required' });
      return;
    }

    if (resourceType === 'help') {
      await restoreHelpFromTrash(id, user._id, staffRole, req);
      res.json({ success: true });
      return;
    }

    if (resourceType === 'blog') {
      if (!isAdminRequest(req)) {
        res.status(403).json({ success: false, message: 'Only admin can restore blog posts' });
        return;
      }
      await restoreBlogPostAsAdmin(id, user._id, req);
      res.json({ success: true });
      return;
    }

    if (resourceType === 'user') {
      if (!isAdminRequest(req)) {
        res.status(403).json({ success: false, message: 'Only admin can restore user accounts' });
        return;
      }
      await restoreUserAsAdmin(id, user._id, req);
      res.json({ success: true });
      return;
    }

    res.status(400).json({ success: false, message: 'Invalid resourceType' });
  } catch (err) {
    sendTrashError(res, err);
  }
}
