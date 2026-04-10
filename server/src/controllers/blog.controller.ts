import { Request, Response } from 'express';
import type { AuthUser } from '../middlewares/auth/index.js';
import { sanitizeThumbnailUrl, validateBlogPostContent } from '../modules/blog/blogContentValidation.js';
import { BlogPostModel } from '../models/BlogPost.js';
import { UserModel, normalizeProfileImg } from '../models/User.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}

const SLUG_MAX_LEN = 320;

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

/** Same author cannot reuse a slug; append a short suffix until unique (schema max 320). */
function slugWithCollisionSuffix(base: string, attempt: number): string {
  if (attempt <= 0) return base.slice(0, SLUG_MAX_LEN);
  const suf = `-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const room = SLUG_MAX_LEN - suf.length;
  return `${base.slice(0, Math.max(1, room))}${suf}`;
}

/** POST /api/blog - create a new blog post (draft or published) */
export async function createPost(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { title, summary, content, thumbnailUrl, status } = req.body as {
      title?: string;
      summary?: string;
      content?: string;
      thumbnailUrl?: string;
      status?: 'draft' | 'published';
    };
    const titleStr = typeof title === 'string' ? title.trim() : '';
    const contentStr = typeof content === 'string' ? content : '';
    if (!titleStr || titleStr.length > 300) {
      res.status(400).json({ success: false, message: 'Title is required and must be at most 300 characters' });
      return;
    }
    const contentCheck = validateBlogPostContent(contentStr);
    if (!contentCheck.ok) {
      res.status(contentCheck.status).json({ success: false, message: contentCheck.message });
      return;
    }
    const baseSlug = slugify(titleStr);
    const finalStatus = status === 'published' ? 'published' : 'draft';
    const thumb = sanitizeThumbnailUrl(thumbnailUrl);
    const summaryStr = typeof summary === 'string' ? summary.trim().slice(0, 500) : '';

    let post = null;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 12; attempt++) {
      const slug = slugWithCollisionSuffix(baseSlug, attempt);
      try {
        post = await BlogPostModel.create({
          authorId: user._id,
          title: titleStr,
          slug,
          summary: summaryStr || undefined,
          content: contentCheck.normalizedJson,
          thumbnailUrl: thumb,
          status: finalStatus,
        });
        break;
      } catch (err) {
        lastErr = err;
        const e = err as { code?: number };
        if (e.code === 11000) continue;
        throw err;
      }
    }
    if (!post) {
      const e = lastErr as { code?: number };
      if (e?.code === 11000) {
        res.status(409).json({
          success: false,
          message: 'Could not allocate a unique URL slug. Try a slightly different title.',
        });
        return;
      }
      throw lastErr;
    }

    res.status(201).json({
      success: true,
      post: {
        _id: post._id,
        title: post.title,
        slug: post.slug,
        summary: post.summary,
        content: post.content,
        thumbnailUrl: post.thumbnailUrl,
        status: post.status,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
}

/** PUT /api/blog/draft - upsert current user's draft (sync from local) */
export async function upsertDraft(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { title, summary, content, thumbnailUrl } = req.body as {
      title?: string;
      summary?: string;
      content?: string;
      thumbnailUrl?: string;
    };
    const titleStr = typeof title === 'string' ? title.trim() : '';
    const contentStr = typeof content === 'string' ? content : '';
    const summaryStr = typeof summary === 'string' ? summary.trim().slice(0, 500) : '';
    const contentCheck = validateBlogPostContent(contentStr);
    if (!contentCheck.ok) {
      res.status(contentCheck.status).json({ success: false, message: contentCheck.message });
      return;
    }
    const thumb = sanitizeThumbnailUrl(thumbnailUrl);
    const finalTitle = titleStr || 'Untitled draft';

    const post = await BlogPostModel.findOne({ authorId: user._id, status: 'draft' })
      .sort({ updatedAt: -1 })
      .limit(1)
      .lean();

    if (post) {
      const slug = slugify(finalTitle);
      const updated = await BlogPostModel.findByIdAndUpdate(
        post._id,
        {
          title: finalTitle,
          slug,
          summary: summaryStr || undefined,
          content: contentCheck.normalizedJson,
          thumbnailUrl: thumb,
        },
        { new: true }
      );
      if (!updated) {
        res.status(404).json({ success: false, message: 'Draft not found' });
        return;
      }
      res.status(200).json({
        success: true,
        post: {
          _id: updated._id,
          title: updated.title,
          slug: updated.slug,
          summary: updated.summary,
          content: updated.content,
          thumbnailUrl: updated.thumbnailUrl,
          status: updated.status,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      });
      return;
    }

    const uniqueSlug = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const created = await BlogPostModel.create({
      authorId: user._id,
      title: finalTitle,
      slug: uniqueSlug,
      summary: summaryStr || undefined,
      content: contentCheck.normalizedJson,
      thumbnailUrl: thumb,
      status: 'draft',
    });

    res.status(201).json({
      success: true,
      post: {
        _id: created._id,
        title: created.title,
        slug: created.slug,
        summary: created.summary,
        content: created.content,
        thumbnailUrl: created.thumbnailUrl,
        status: created.status,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    });
  } catch (err) {
    const e = err as { code?: number };
    if (e.code === 11000) {
      res.status(409).json({ success: false, message: 'Draft slug conflict. Try a different title.' });
      return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save draft' });
  }
}

/** GET /api/blog/draft - get current user's single draft (for sync/restore) */
export async function getDraft(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const draft = await BlogPostModel.findOne({ authorId: user._id, status: 'draft' })
      .sort({ updatedAt: -1 })
      .limit(1)
      .lean();
    if (!draft) {
      res.status(200).json({ success: true, draft: null });
      return;
    }
    res.status(200).json({
      success: true,
      draft: {
        _id: draft._id,
        title: draft.title,
        slug: draft.slug,
        summary: (draft as { summary?: string }).summary,
        content: draft.content,
        thumbnailUrl: (draft as { thumbnailUrl?: string }).thumbnailUrl,
        status: draft.status,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to get draft' });
  }
}

/** GET /api/blog/feed — public: recent published posts (home / explore). */
export async function listPublishedFeed(req: Request, res: Response): Promise<void> {
  try {
    const raw = Number.parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(raw) ? Math.min(50, Math.max(1, raw)) : 20;
    const posts = await BlogPostModel.find({ status: 'published' })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate({ path: 'authorId', select: 'username fullName profileImg', model: 'users' })
      .lean();

    const items = posts
      .map((p) => {
        const authorRaw = p.authorId as unknown;
        if (!authorRaw || typeof authorRaw !== 'object' || Array.isArray(authorRaw)) {
          return null;
        }
        const a = authorRaw as { username?: string; fullName?: string; profileImg?: string };
        if (typeof a.username !== 'string' || !a.username.trim()) {
          return null;
        }
        return {
          _id: String(p._id),
          title: p.title,
          slug: p.slug,
          summary: (p as { summary?: string }).summary ?? '',
          thumbnailUrl: (p as { thumbnailUrl?: string }).thumbnailUrl,
          updatedAt: p.updatedAt,
          createdAt: p.createdAt,
          author: {
            username: a.username.trim(),
            fullName: typeof a.fullName === 'string' && a.fullName.trim() ? a.fullName.trim() : a.username.trim(),
            profileImg: normalizeProfileImg(a.profileImg),
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    res.status(200).json({ success: true, posts: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load feed' });
  }
}

/** GET /api/blog/p/:username/:slug — public: one published post by author username + slug. */
export async function getPublishedPostBySlug(req: Request, res: Response): Promise<void> {
  try {
    const usernameParam = paramString(req.params.username);
    const slug = paramString(req.params.slug);
    if (!usernameParam || !slug) {
      res.status(400).json({ success: false, message: 'Invalid path' });
      return;
    }
    const user = await UserModel.findOne({
      username: new RegExp(`^${escapeRegex(usernameParam)}$`, 'i'),
    })
      .select('_id')
      .lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'Author not found' });
      return;
    }
    const post = await BlogPostModel.findOne({
      authorId: user._id,
      slug,
      status: 'published',
    })
      .populate({ path: 'authorId', select: 'username fullName profileImg', model: 'users' })
      .lean();
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    const aRaw = post.authorId as unknown;
    if (!aRaw || typeof aRaw !== 'object' || Array.isArray(aRaw)) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    const a = aRaw as { username: string; fullName?: string; profileImg?: string };
    res.status(200).json({
      success: true,
      post: {
        _id: String(post._id),
        title: post.title,
        slug: post.slug,
        summary: (post as { summary?: string }).summary ?? '',
        content: post.content,
        thumbnailUrl: (post as { thumbnailUrl?: string }).thumbnailUrl,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: {
          username: a.username,
          fullName: a.fullName?.trim() ? a.fullName : a.username,
          profileImg: normalizeProfileImg(a.profileImg),
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load post' });
  }
}

/** GET /api/blog - list current user's posts (for now: my posts only) */
export async function listMyPosts(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const status = (req.query.status as string) || undefined;
    const filter: { authorId: string; status?: 'draft' | 'published' } = { authorId: user._id };
    if (status === 'draft' || status === 'published') filter.status = status;

    const posts = await BlogPostModel.find(filter)
      .select('title slug summary content thumbnailUrl status createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      posts: posts.map((p) => ({
        _id: p._id,
        title: p.title,
        slug: p.slug,
        summary: (p as { summary?: string }).summary,
        content: p.content,
        thumbnailUrl: (p as { thumbnailUrl?: string }).thumbnailUrl,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to list posts' });
  }
}
