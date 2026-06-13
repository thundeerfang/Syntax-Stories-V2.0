import mongoose from 'mongoose';
import type { Request } from 'express';
import { BlogPostModel } from '../../../models/BlogPost.js';
import { UserModel } from '../../../models/User.js';
import { NOT_DELETED_FILTER } from '../../../shared/db/notDeleted.js';
import { AuditAction } from '../../../shared/audit/events.js';
import { writeAuditLog } from '../../../shared/audit/auditLog.js';
import { SEVEN_DAYS_MS } from '../../../constants/durations.js';
import { BLOG_LIMITS } from '@syntax-stories/shared';

const SLUG_MAX_LEN = BLOG_LIMITS.slugMaxLen;

function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replaceAll(/\s+/g, '-')
      .replaceAll(/[^\w-]/g, '')
      .replaceAll(/-+/g, '-')
      .replaceAll(/^-+/g, '')
      .replaceAll(/-+$/g, '')
      .slice(0, 200) || 'post'
  );
}

function slugWithCollisionSuffix(base: string, attempt: number): string {
  if (attempt <= 0) return base.slice(0, SLUG_MAX_LEN);
  const suf = `-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const room = SLUG_MAX_LEN - suf.length;
  return `${base.slice(0, Math.max(1, room))}${suf}`;
}

export class TrashServiceError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'TrashServiceError';
  }
}

export async function listBlogTrash(page: number, pageSize: number) {
  const skip = Math.max(0, (page - 1) * pageSize);
  const q = { deletedAt: { $ne: null, $exists: true } };
  const [rows, total] = await Promise.all([
    BlogPostModel.find(q)
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate({ path: 'authorId', select: 'username fullName email', model: 'users' })
      .lean(),
    BlogPostModel.countDocuments(q),
  ]);
  const data = rows.map((r) => {
    const a = r.authorId as unknown as {
      username?: string;
      fullName?: string;
      email?: string;
    } | null;
    return {
      _id: String(r._id),
      title: r.title,
      slug: r.slug,
      deletedAt: r.deletedAt ? new Date(r.deletedAt).toISOString() : null,
      authorId: String(r.authorId),
      authorUsername: a?.username ?? null,
      authorEmail: a?.email ?? null,
    };
  });
  return { data, total, page, pageSize };
}

export async function listUserTrash(page: number, pageSize: number) {
  const skip = Math.max(0, (page - 1) * pageSize);
  const q = { isActive: false };
  const [rows, total] = await Promise.all([
    UserModel.find(q)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select('_id email username fullName updatedAt')
      .lean(),
    UserModel.countDocuments(q),
  ]);
  const data = rows.map((r) => {
    const u = r as typeof r & { updatedAt?: Date };
    return {
      _id: String(r._id),
      email: r.email,
      username: r.username,
      fullName: r.fullName,
      updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : null,
    };
  });
  return { data, total, page, pageSize };
}

export async function restoreBlogPostAsAdmin(
  postId: string,
  actorId: string,
  req: Request
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new TrashServiceError(400, 'Invalid post id');
  }
  const doc = await BlogPostModel.findById(postId);
  if (!doc?.deletedAt) {
    throw new TrashServiceError(404, 'Post not found or not in trash');
  }
  const del = doc.deletedAt;
  if (del.getTime() < Date.now() - SEVEN_DAYS_MS) {
    throw new TrashServiceError(410, 'Post is outside the recoverable trash window');
  }

  let nextSlug = doc.slug;
  const clash = await BlogPostModel.findOne({
    _id: { $ne: doc._id },
    authorId: doc.authorId,
    slug: doc.slug,
    ...NOT_DELETED_FILTER,
  })
    .select('_id')
    .lean();
  if (clash) {
    const base = slugify(doc.title);
    for (let attempt = 0; attempt < 12; attempt++) {
      const cand = slugWithCollisionSuffix(base, attempt);
      const c2 = await BlogPostModel.findOne({
        authorId: doc.authorId,
        slug: cand,
        ...NOT_DELETED_FILTER,
      })
        .select('_id')
        .lean();
      if (!c2) {
        nextSlug = cand;
        break;
      }
    }
  }

  doc.deletedAt = undefined;
  doc.deletedById = undefined;
  doc.slug = nextSlug;
  doc.status = 'published';
  await doc.save();

  void writeAuditLog(req, AuditAction.ADMIN_BLOG_RESTORED, {
    actorId,
    targetType: 'blog_post',
    targetId: postId,
    metadata: { slug: nextSlug },
  });
}

export async function restoreUserAsAdmin(
  userId: string,
  actorId: string,
  req: Request
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new TrashServiceError(400, 'Invalid user id');
  }
  const u = await UserModel.findById(userId);
  if (!u) {
    throw new TrashServiceError(404, 'User not found');
  }
  if (u.isActive) {
    throw new TrashServiceError(400, 'User is already active');
  }
  u.isActive = true;
  await u.save();
  void writeAuditLog(req, AuditAction.ADMIN_USER_RESTORED, {
    actorId,
    targetType: 'user',
    targetId: userId,
  });
}
