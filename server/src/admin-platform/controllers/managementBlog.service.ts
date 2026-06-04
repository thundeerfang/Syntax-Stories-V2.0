import mongoose from 'mongoose';
import { BlogPostModel } from '../../models/BlogPost.js';
import { BlogRepostModel } from '../../models/BlogRepost.js';
import { adminUserRefFromObjectId } from '../iam/adminUserRef.js';
import { parseBlogContentForAdmin } from '../cms/blog/parseBlogContentForAdmin.js';

const MAX_LIMIT = 100;

function notDeletedPostFilter(): Record<string, unknown> {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

function iso(d: Date | undefined | null): string | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

export async function listAdminBlogs(opts: {
  limit: number;
  cursor?: mongoose.Types.ObjectId;
  status?: 'draft' | 'published' | 'suspended';
  q?: string;
}) {
  const clauses: Record<string, unknown>[] = [notDeletedPostFilter()];
  if (opts.status) clauses.push({ status: opts.status });
  if (opts.q) {
    const rx = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    clauses.push({ $or: [{ title: rx }, { slug: rx }] });
  }
  if (opts.cursor) clauses.push({ _id: { $lt: opts.cursor } });
  const filter = clauses.length === 1 ? clauses[0]! : { $and: clauses };

  const rows = await BlogPostModel.find(filter)
    .sort({ _id: -1 })
    .limit(opts.limit + 1)
    .select(
      'title slug status publishedAt respectCount viewCount commentCount repostCount bookmarkCount updatedAt thumbnailUrl authorId'
    )
    .populate({ path: 'authorId', select: 'username fullName email' })
    .lean();

  const slice = rows.slice(0, opts.limit);
  const nextCursor = rows.length > opts.limit ? String(slice[slice.length - 1]!._id) : null;

  return {
    items: slice.map((p) => {
      const author = p.authorId as
        | { _id?: mongoose.Types.ObjectId; username?: string; fullName?: string }
        | mongoose.Types.ObjectId
        | null;
      const authorId =
        author && typeof author === 'object' && '_id' in author && author._id
          ? String(author._id)
          : typeof author === 'object' && author && 'toString' in author
            ? String(author)
            : null;
      const username =
        author && typeof author === 'object' && 'username' in author
          ? String(author.username ?? '')
          : '';
      const fullName =
        author && typeof author === 'object' && 'fullName' in author
          ? String(author.fullName ?? '')
          : '';

      return {
        id: String(p._id),
        title: p.title,
        slug: p.slug,
        status: p.status as 'draft' | 'published' | 'suspended',
        publishedAt: iso(p.publishedAt),
        updatedAt: iso(p.updatedAt),
        respectCount: p.respectCount ?? 0,
        viewCount: p.viewCount ?? 0,
        commentCount: p.commentCount ?? 0,
        repostCount: p.repostCount ?? 0,
        bookmarkCount: p.bookmarkCount ?? 0,
        thumbnailUrl: p.thumbnailUrl ?? null,
        authorId,
        authorRef: adminUserRefFromObjectId(authorId),
        authorUsername: username,
        authorFullName: fullName,
      };
    }),
    nextCursor,
  };
}

export async function loadAdminBlogDetail(postId: mongoose.Types.ObjectId) {
  const post = await BlogPostModel.findById(postId)
    .populate({ path: 'authorId', select: 'username fullName profileImg email' })
    .lean();

  if (!post) return null;

  const author = post.authorId as
    | {
        _id?: mongoose.Types.ObjectId;
        username?: string;
        fullName?: string;
        profileImg?: string;
        email?: string;
      }
    | mongoose.Types.ObjectId
    | null;
  const authorId =
    author && typeof author === 'object' && '_id' in author && author._id
      ? String(author._id)
      : String(author ?? '');
  const username =
    author && typeof author === 'object' && 'username' in author
      ? String(author.username ?? '')
      : '';
  const fullName =
    author && typeof author === 'object' && 'fullName' in author
      ? String(author.fullName ?? '')
      : '';
  const profileImg =
    author && typeof author === 'object' && 'profileImg' in author
      ? (author.profileImg ?? null)
      : null;

  const parsed = parseBlogContentForAdmin(post.content, post.thumbnailUrl);

  const recentReposts = await BlogRepostModel.find({ postId })
    .sort({ createdAt: -1 })
    .limit(24)
    .populate({ path: 'userId', select: 'username fullName' })
    .lean();

  const email =
    author && typeof author === 'object' && 'email' in author ? String(author.email ?? '') : '';

  return {
    author: {
      id: authorId,
      ref: adminUserRefFromObjectId(authorId),
      username,
      fullName,
      email: email || null,
      profileImg: profileImg ? String(profileImg) : null,
    },
    post: {
      id: String(post._id),
      title: post.title,
      slug: post.slug,
      summary: post.summary ?? '',
      status: post.status as 'draft' | 'published' | 'suspended',
      thumbnailUrl: post.thumbnailUrl ?? null,
      category: post.category ?? null,
      tags: post.tags ?? [],
      language: post.language ?? 'en',
      publishedAt: iso(post.publishedAt),
      lastEditedAt: iso(post.lastEditedAt),
      createdAt: iso(post.createdAt),
      updatedAt: iso(post.updatedAt),
      deletedAt: iso(post.deletedAt),
      respectCount: post.respectCount ?? 0,
      repostCount: post.repostCount ?? 0,
      bookmarkCount: post.bookmarkCount ?? 0,
      commentCount: post.commentCount ?? 0,
      viewCount: post.viewCount ?? 0,
      squadId: post.squadId ? String(post.squadId) : null,
      content: post.content,
      blocks: parsed.blocks,
      blockSummaries: parsed.blockSummaries,
      images: parsed.images,
      textExcerpt: parsed.textExcerpt,
      recentReposts: recentReposts.map((r) => {
        const u = r.userId as
          | { username?: string; fullName?: string }
          | mongoose.Types.ObjectId
          | null;
        const reposterUsername =
          u && typeof u === 'object' && 'username' in u ? String(u.username ?? '') : '';
        const reposterFullName =
          u && typeof u === 'object' && 'fullName' in u ? String(u.fullName ?? '') : '';
        return {
          id: String(r._id),
          username: reposterUsername,
          fullName: reposterFullName,
          createdAt: iso(r.createdAt),
        };
      }),
    },
  };
}

export function parseBlogListLimit(raw: unknown): number {
  const n = Number(raw);
  return Math.min(Number.isFinite(n) && n > 0 ? Math.floor(n) : 25, MAX_LIMIT);
}
