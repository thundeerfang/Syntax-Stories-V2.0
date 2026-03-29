import { Request, Response } from 'express';
import type { AuthUser } from '../middlewares/auth/index.js';
import { BlogPostModel } from '../models/BlogPost.js';

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
    const slug = slugify(titleStr);
    const finalStatus = status === 'published' ? 'published' : 'draft';
    const thumb = typeof thumbnailUrl === 'string' && thumbnailUrl.trim() ? thumbnailUrl.trim().slice(0, 2000) : undefined;
    const summaryStr = typeof summary === 'string' ? summary.trim().slice(0, 500) : '';

    const post = await BlogPostModel.create({
      authorId: user._id,
      title: titleStr,
      slug,
      summary: summaryStr || undefined,
      content: contentStr,
      thumbnailUrl: thumb,
      status: finalStatus,
    });

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
    const e = err as { code?: number };
    if (e.code === 11000) {
      res.status(409).json({ success: false, message: 'A post with this slug already exists. Try a different title or slug.' });
      return;
    }
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
    const thumb = typeof thumbnailUrl === 'string' && thumbnailUrl.trim() ? thumbnailUrl.trim().slice(0, 2000) : undefined;
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
          content: contentStr,
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
      content: contentStr,
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
