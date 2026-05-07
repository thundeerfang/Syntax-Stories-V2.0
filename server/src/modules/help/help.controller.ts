import type { Request, Response } from 'express';
import type { AuthUser } from '../../middlewares/auth/index.js';
import { AuditAction } from '../../shared/audit/events.js';
import { writeAuditLog } from '../../shared/audit/auditLog.js';
import { helpService, HelpServiceError } from './help.service.js';
import type { StaffRole } from './requireStaff.middleware.js';

function paramId(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? String(v[0]) : String(v ?? '');
}

function sendError(res: Response, err: unknown): void {
  if (err instanceof HelpServiceError) {
    res.status(err.status).json({ success: false, message: err.message, code: err.code });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

export async function listPublishedArticles(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(req.query.pageSize ?? '20'), 10) || 20));
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const envelope = await helpService.listPublished(page, pageSize, category);
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(envelope);
  } catch (err) {
    sendError(res, err);
  }
}

export async function getPublishedArticleBySlug(req: Request, res: Response): Promise<void> {
  try {
    const slug = paramId(req, 'slug');
    if (!slug) {
      res.status(400).json({ success: false, message: 'Missing slug' });
      return;
    }
    const result = await helpService.getPublicBySlug(slug);
    if (!result) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.status(result.status).json({ success: true, data: result.dto });
  } catch (err) {
    sendError(res, err);
  }
}

function authIds(req: Request): { userId: string; staffRole: StaffRole } {
  const user = (req as Request & { user: AuthUser }).user;
  const staffRole = (req as Request & { staffRole: StaffRole }).staffRole;
  return { userId: user._id, staffRole };
}

export async function listAdminArticles(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(req.query.pageSize ?? '30'), 10) || 30));
    const result = await helpService.listAdmin(page, pageSize);
    res.json({
      version: 1,
      ...result,
    });
  } catch (err) {
    sendError(res, err);
  }
}

export async function getAdminArticle(req: Request, res: Response): Promise<void> {
  try {
    const { userId, staffRole } = authIds(req);
    const doc = await helpService.getAdminById(paramId(req, 'id'), userId, staffRole);
    res.json({
      success: true,
      data: {
        _id: String(doc._id),
        slug: doc.slug,
        slugHistory: doc.slugHistory,
        title: doc.title,
        summary: doc.summary,
        body: doc.body,
        bodyFormat: doc.bodyFormat,
        category: doc.category,
        tags: doc.tags,
        draftTitle: doc.draftTitle,
        draftSummary: doc.draftSummary,
        draftBody: doc.draftBody,
        status: doc.status,
        isPublished: doc.isPublished,
        draftVersion: doc.draftVersion,
        publishedVersion: doc.publishedVersion,
        publishAt: doc.publishAt ? doc.publishAt.toISOString() : null,
        lockedBy: doc.lockedBy ? String(doc.lockedBy) : null,
        lockedAt: doc.lockedAt ? doc.lockedAt.toISOString() : null,
        publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
        authorId: String(doc.authorId),
        updatedAt: doc.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    sendError(res, err);
  }
}

export async function createAdminArticle(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = authIds(req);
    const body = req.body as {
      slug?: string;
      title?: string;
      summary?: string;
      category?: string;
      tags?: string[];
    };
    if (!body.slug || !body.title) {
      res.status(400).json({ success: false, message: 'slug and title required' });
      return;
    }
    const doc = await helpService.createArticle(userId, {
      slug: body.slug,
      title: body.title,
      summary: body.summary,
      category: body.category,
      tags: body.tags,
    });
    res.status(201).json({ success: true, data: { id: String(doc._id), slug: doc.slug } });
  } catch (err) {
    sendError(res, err);
  }
}

export async function patchAdminArticle(req: Request, res: Response): Promise<void> {
  try {
    const { userId, staffRole } = authIds(req);
    const body = req.body as {
      draftTitle?: string;
      draftSummary?: string;
      draftBody?: string;
      slug?: string;
      category?: string;
      tags?: string[];
      publishAt?: string | null;
      expectedDraftVersion?: number;
    };
    const patchInput: Parameters<typeof helpService.updateDraft>[3] = {};
    if (body.draftTitle !== undefined) patchInput.draftTitle = body.draftTitle;
    if (body.draftSummary !== undefined) patchInput.draftSummary = body.draftSummary;
    if (body.draftBody !== undefined) patchInput.draftBody = body.draftBody;
    if (body.slug !== undefined) patchInput.slug = body.slug;
    if (body.category !== undefined) patchInput.category = body.category;
    if (body.tags !== undefined) patchInput.tags = body.tags;
    if (body.expectedDraftVersion !== undefined) patchInput.expectedDraftVersion = body.expectedDraftVersion;
    if (body.publishAt !== undefined) {
      patchInput.publishAt = body.publishAt === null ? null : new Date(body.publishAt);
    }
    const doc = await helpService.updateDraft(userId, staffRole, paramId(req, 'id'), patchInput);
    res.json({ success: true, data: { draftVersion: doc.draftVersion, slug: doc.slug } });
  } catch (err) {
    sendError(res, err);
  }
}

export async function postPublish(req: Request, res: Response): Promise<void> {
  try {
    const { userId, staffRole } = authIds(req);
    const expectedPublishedVersion =
      req.body?.expectedPublishedVersion !== undefined
        ? Number(req.body.expectedPublishedVersion)
        : undefined;
    const doc = await helpService.publish(userId, staffRole, paramId(req, 'id'), expectedPublishedVersion);
    res.json({ success: true, data: { publishedVersion: doc.publishedVersion } });
  } catch (err) {
    sendError(res, err);
  }
}

export async function postRollback(req: Request, res: Response): Promise<void> {
  try {
    const { userId, staffRole } = authIds(req);
    const targetVersion = Number(req.body?.targetVersion);
    if (!Number.isFinite(targetVersion)) {
      res.status(400).json({ success: false, message: 'targetVersion required' });
      return;
    }
    const expectedPublishedVersion =
      req.body?.expectedPublishedVersion !== undefined
        ? Number(req.body.expectedPublishedVersion)
        : undefined;
    const doc = await helpService.rollback(
      userId,
      staffRole,
      paramId(req, 'id'),
      targetVersion,
      expectedPublishedVersion
    );
    res.json({ success: true, data: { publishedVersion: doc.publishedVersion } });
  } catch (err) {
    sendError(res, err);
  }
}

export async function postLock(req: Request, res: Response): Promise<void> {
  try {
    const { userId, staffRole } = authIds(req);
    await helpService.acquireLock(userId, staffRole, paramId(req, 'id'));
    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
}

export async function deleteLock(req: Request, res: Response): Promise<void> {
  try {
    const { userId, staffRole } = authIds(req);
    await helpService.releaseLock(userId, staffRole, paramId(req, 'id'));
    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
}

/** DELETE — soft-delete (move to trash). */
export async function deleteAdminArticle(req: Request, res: Response): Promise<void> {
  try {
    const { userId, staffRole } = authIds(req);
    const id = paramId(req, 'id');
    await helpService.softDelete(userId, staffRole, id);
    void writeAuditLog(req, AuditAction.ADMIN_HELP_SOFT_DELETED, {
      actorId: userId,
      targetType: 'help_article',
      targetId: id,
    });
    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
}
