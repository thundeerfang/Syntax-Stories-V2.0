import mongoose, { Types } from 'mongoose';
import { NOT_DELETED_FILTER } from '../../shared/db/notDeleted.js';
import { HelpArticleModel, type IHelpArticle, type HelpArticleStatus } from './helpArticle.model.js';
import { HelpArticleVersionModel } from './helpArticleVersion.model.js';
import {
  HELP_API_RESPONSE_VERSION,
  HELP_LIST_PIPELINE_VERSION,
  type HelpArticleAdminListItem,
  type HelpArticleListEnvelope,
} from './help.dto.js';
import { helpCanonicalPath, toHelpArticlePublicDTO } from './help.mappers.js';
import type { StaffRole } from './requireStaff.middleware.js';

const MIN_PUBLISH_BODY_LENGTH = 50;
const LOCK_TTL_MS = 8 * 60 * 1000;

function activeHelpFilter(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { $and: [extra, NOT_DELETED_FILTER] };
}

function canEditArticle(actorId: string, staffRole: StaffRole, doc: IHelpArticle): boolean {
  if (staffRole === 'admin') return true;
  return String(doc.authorId) === actorId;
}

export class HelpServiceError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'HelpServiceError';
  }
}

function assertPublishable(doc: Pick<IHelpArticle, 'title' | 'body'>): void {
  const title = doc.title?.trim() ?? '';
  const body = doc.body?.trim() ?? '';
  if (!title) throw new HelpServiceError(400, 'Title is required to publish', 'VALIDATION');
  if (body.length < MIN_PUBLISH_BODY_LENGTH) {
    throw new HelpServiceError(
      400,
      `Body must be at least ${MIN_PUBLISH_BODY_LENGTH} characters to publish`,
      'VALIDATION'
    );
  }
}

async function archiveLiveSnapshotBeforePublish(
  doc: IHelpArticle,
  publishedBy: string
): Promise<void> {
  if (!doc.isPublished || doc.publishedVersion < 1) return;
  await HelpArticleVersionModel.create({
    articleId: doc._id,
    version: doc.publishedVersion,
    title: doc.title,
    summary: doc.summary ?? '',
    body: doc.body ?? '',
    bodyFormat: doc.bodyFormat,
    publishedAt: doc.publishedAt ?? new Date(),
    publishedBy: new Types.ObjectId(publishedBy),
  });
}

export const helpService = {
  async listPublished(page: number, pageSize: number, category?: string) {
    const base: Record<string, unknown> = { isPublished: true, status: { $ne: 'archived' } };
    if (category) base.category = category;
    const q = activeHelpFilter(base);
    const skip = Math.max(0, (page - 1) * pageSize);
    const [rows, total] = await Promise.all([
      HelpArticleModel.find(q).sort({ publishedAt: -1 }).skip(skip).limit(pageSize).lean(),
      HelpArticleModel.countDocuments(q),
    ]);
    const data = rows.map((r) =>
      toHelpArticlePublicDTO(r as unknown as IHelpArticle)
    );
    const envelope: HelpArticleListEnvelope = {
      version: HELP_API_RESPONSE_VERSION,
      listPipelineVersion: HELP_LIST_PIPELINE_VERSION,
      data,
      page,
      pageSize,
      total,
    };
    return envelope;
  },

  async getPublicBySlug(slug: string) {
    const doc = await HelpArticleModel.findOne(activeHelpFilter({ slug })).exec();
    if (doc && doc.isPublished && doc.status !== 'archived') {
      return { dto: toHelpArticlePublicDTO(doc), status: 200 as const };
    }
    const legacy = await HelpArticleModel.findOne(
      activeHelpFilter({
        slugHistory: slug,
        isPublished: true,
        status: { $ne: 'archived' },
      })
    ).exec();
    if (legacy) {
      const canonical = helpCanonicalPath(legacy);
      return {
        dto: toHelpArticlePublicDTO(legacy, { redirectTo: canonical }),
        status: 200 as const,
      };
    }
    return null;
  },

  async listAdmin(page: number, pageSize: number) {
    const skip = Math.max(0, (page - 1) * pageSize);
    const q = activeHelpFilter({});
    const [rows, total] = await Promise.all([
      HelpArticleModel.find(q).sort({ updatedAt: -1 }).skip(skip).limit(pageSize).lean(),
      HelpArticleModel.countDocuments(q),
    ]);
    const data: HelpArticleAdminListItem[] = rows.map((r) => ({
      _id: String(r._id),
      slug: r.slug,
      title: r.title,
      status: r.status,
      isPublished: r.isPublished,
      draftVersion: r.draftVersion,
      publishedVersion: r.publishedVersion,
      publishAt: r.publishAt ? new Date(r.publishAt).toISOString() : null,
      updatedAt: new Date(r.updatedAt).toISOString(),
      authorId: String(r.authorId),
    }));
    return { data, total, page, pageSize };
  },

  async getAdminById(id: string, actorId: string, staffRole: StaffRole) {
    if (!mongoose.isValidObjectId(id)) throw new HelpServiceError(400, 'Invalid id');
    const doc = await HelpArticleModel.findOne(activeHelpFilter({ _id: new Types.ObjectId(id) })).exec();
    if (!doc) throw new HelpServiceError(404, 'Article not found');
    if (!canEditArticle(actorId, staffRole, doc)) {
      throw new HelpServiceError(403, 'Forbidden');
    }
    return doc;
  },

  async createArticle(
    authorId: string,
    input: {
      slug: string;
      title: string;
      summary?: string;
      category?: string;
      tags?: string[];
    }
  ) {
    const slug = input.slug.trim().toLowerCase().replace(/\s+/g, '-');
    const exists = await HelpArticleModel.findOne(activeHelpFilter({ slug })).lean();
    if (exists) throw new HelpServiceError(409, 'Slug already in use', 'SLUG_TAKEN');
    const doc = await HelpArticleModel.create({
      slug,
      slugHistory: [],
      title: input.title.trim(),
      summary: input.summary?.trim() ?? '',
      body: '',
      bodyFormat: 'markdown',
      category: input.category?.trim() || 'general',
      tags: input.tags ?? [],
      status: 'draft' as HelpArticleStatus,
      isPublished: false,
      draftVersion: 1,
      publishedVersion: 0,
      authorId: new Types.ObjectId(authorId),
      contentSchemaVersion: 1,
    });
    return doc;
  },

  async updateDraft(
    actorId: string,
    staffRole: StaffRole,
    id: string,
    input: {
      draftTitle?: string;
      draftSummary?: string;
      draftBody?: string;
      slug?: string;
      category?: string;
      tags?: string[];
      publishAt?: Date | null;
      expectedDraftVersion?: number;
    }
  ) {
    const doc = await this.getAdminById(id, actorId, staffRole);
    if (input.expectedDraftVersion !== undefined && input.expectedDraftVersion !== doc.draftVersion) {
      throw new HelpServiceError(409, 'Draft conflict — refresh and retry', 'VERSION_CONFLICT');
    }
    if (input.draftTitle !== undefined) doc.draftTitle = input.draftTitle;
    if (input.draftSummary !== undefined) doc.draftSummary = input.draftSummary;
    if (input.draftBody !== undefined) doc.draftBody = input.draftBody;
    if (input.category !== undefined) doc.category = input.category;
    if (input.tags !== undefined) doc.tags = input.tags;
    if (input.publishAt !== undefined) {
      doc.publishAt = input.publishAt;
      if (input.publishAt) doc.status = 'scheduled';
    }
    if (input.slug !== undefined && input.slug !== doc.slug) {
      const newSlug = input.slug.trim().toLowerCase().replace(/\s+/g, '-');
      const taken = await HelpArticleModel.findOne(
        activeHelpFilter({ slug: newSlug, _id: { $ne: doc._id } })
      ).lean();
      if (taken) throw new HelpServiceError(409, 'Slug already in use', 'SLUG_TAKEN');
      doc.slugHistory = [...new Set([...(doc.slugHistory ?? []), doc.slug])];
      doc.slug = newSlug;
    }
    doc.draftVersion += 1;
    await doc.save();
    return doc;
  },

  async publish(
    actorId: string,
    staffRole: StaffRole,
    id: string,
    expectedPublishedVersion?: number
  ) {
    const doc = await this.getAdminById(id, actorId, staffRole);
    if (expectedPublishedVersion !== undefined && expectedPublishedVersion !== doc.publishedVersion) {
      throw new HelpServiceError(409, 'Publish conflict — refresh and retry', 'VERSION_CONFLICT');
    }
    const title = (doc.draftTitle ?? doc.title)?.trim() ?? '';
    const summary = (doc.draftSummary ?? doc.summary)?.trim() ?? '';
    const body = (doc.draftBody ?? doc.body)?.trim() ?? '';
    const next = { ...doc.toObject(), title, summary, body };
    assertPublishable({ title: next.title, body: next.body });

    await archiveLiveSnapshotBeforePublish(doc, actorId);

    doc.title = title;
    doc.summary = summary;
    doc.body = body;
    doc.isPublished = true;
    doc.status = 'published';
    doc.publishedVersion += 1;
    doc.publishedAt = new Date();
    doc.publishAt = null;
    doc.draftTitle = undefined;
    doc.draftSummary = undefined;
    doc.draftBody = undefined;
    await doc.save();
    return doc;
  },

  async rollback(
    actorId: string,
    staffRole: StaffRole,
    id: string,
    targetVersion: number,
    expectedPublishedVersion?: number
  ) {
    if (staffRole !== 'admin') {
      throw new HelpServiceError(403, 'Only admin can rollback', 'FORBIDDEN');
    }
    const doc = await this.getAdminById(id, actorId, staffRole);
    if (expectedPublishedVersion !== undefined && expectedPublishedVersion !== doc.publishedVersion) {
      throw new HelpServiceError(409, 'Rollback conflict', 'VERSION_CONFLICT');
    }
    const ver = await HelpArticleVersionModel.findOne({ articleId: doc._id, version: targetVersion }).exec();
    if (!ver) throw new HelpServiceError(404, 'Version not found');
    await archiveLiveSnapshotBeforePublish(doc, actorId);
    doc.title = ver.title;
    doc.summary = ver.summary;
    doc.body = ver.body;
    doc.bodyFormat = ver.bodyFormat;
    doc.publishedVersion += 1;
    doc.publishedAt = new Date();
    await doc.save();
    return doc;
  },

  async acquireLock(actorId: string, staffRole: StaffRole, id: string) {
    const doc = await this.getAdminById(id, actorId, staffRole);
    const now = Date.now();
    const lockedAt = doc.lockedAt?.getTime() ?? 0;
    const stale = !doc.lockedBy || now - lockedAt > LOCK_TTL_MS;
    if (doc.lockedBy && !stale && String(doc.lockedBy) !== actorId) {
      throw new HelpServiceError(409, 'Article locked by another editor', 'LOCKED');
    }
    doc.lockedBy = new Types.ObjectId(actorId);
    doc.lockedAt = new Date();
    await doc.save();
    return doc;
  },

  async releaseLock(actorId: string, staffRole: StaffRole, id: string) {
    const doc = await this.getAdminById(id, actorId, staffRole);
    if (doc.lockedBy && String(doc.lockedBy) !== actorId && staffRole !== 'admin') {
      throw new HelpServiceError(403, 'Cannot release someone else lock');
    }
    doc.lockedBy = null;
    doc.lockedAt = null;
    await doc.save();
    return doc;
  },

  async listTrash(page: number, pageSize: number) {
    const skip = Math.max(0, (page - 1) * pageSize);
    const q = { deletedAt: { $ne: null, $exists: true } };
    const [rows, total] = await Promise.all([
      HelpArticleModel.find(q).sort({ deletedAt: -1 }).skip(skip).limit(pageSize).lean(),
      HelpArticleModel.countDocuments(q),
    ]);
    const data = rows.map((r) => ({
      _id: String(r._id),
      slug: r.slug,
      slugBeforeDelete: r.slugBeforeDelete ?? null,
      title: r.title,
      deletedAt: r.deletedAt ? new Date(r.deletedAt).toISOString() : null,
      authorId: String(r.authorId),
    }));
    return { data, total, page, pageSize };
  },

  async softDelete(actorId: string, staffRole: StaffRole, id: string) {
    const doc = await this.getAdminById(id, actorId, staffRole);
    if (doc.deletedAt) {
      throw new HelpServiceError(400, 'Article already in trash', 'ALREADY_DELETED');
    }
    const orig = doc.slug;
    doc.slugBeforeDelete = orig;
    doc.slugHistory = [...new Set([...(doc.slugHistory ?? []), orig])];
    const suffix = `--deleted--${String(doc._id).slice(-8)}`;
    let nextSlug = `${orig}${suffix}`;
    if (nextSlug.length > 200) {
      nextSlug = `${orig.slice(0, Math.max(1, 200 - suffix.length))}${suffix}`;
    }
    doc.slug = nextSlug;
    doc.deletedAt = new Date();
    doc.deletedById = new Types.ObjectId(actorId);
    doc.lockedBy = null;
    doc.lockedAt = null;
    doc.isPublished = false;
    doc.status = 'archived';
    await doc.save();
    return doc;
  },

  async restoreFromTrash(actorId: string, staffRole: StaffRole, id: string) {
    if (!mongoose.isValidObjectId(id)) throw new HelpServiceError(400, 'Invalid id');
    const doc = await HelpArticleModel.findById(id).exec();
    if (!doc?.deletedAt) throw new HelpServiceError(404, 'Article not in trash');
    if (!canEditArticle(actorId, staffRole, doc)) {
      throw new HelpServiceError(403, 'Forbidden');
    }
    const targetSlug = (doc.slugBeforeDelete ?? doc.slug.replace(/--deleted--[a-f0-9]{8}$/i, '')).trim();
    if (!targetSlug) throw new HelpServiceError(400, 'Cannot resolve slug to restore');
    const clash = await HelpArticleModel.findOne(
      activeHelpFilter({ slug: targetSlug, _id: { $ne: doc._id } })
    ).lean();
    let nextSlug = targetSlug;
    if (clash) {
      const rest = `-restored-${String(doc._id).slice(-6)}`;
      nextSlug = `${targetSlug.slice(0, Math.max(1, 200 - rest.length))}${rest}`;
    }
    doc.slug = nextSlug;
    doc.slugBeforeDelete = undefined;
    doc.deletedAt = null;
    doc.deletedById = null;
    doc.status = 'draft';
    await doc.save();
    return doc;
  },
};
