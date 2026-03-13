import { Request, Response } from 'express';
import type { AuthUser } from '../middlewares/auth';
import { BlogPostModel } from '../models/BlogPost';

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200) || 'post';
}

/** POST /api/blog - create a new blog post (draft or published) */
export async function createPost(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { title, content, thumbnailUrl, status } = req.body as {
      title?: string;
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

    const post = await BlogPostModel.create({
      authorId: user._id,
      title: titleStr,
      slug,
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
    if (status === 'draft' || status === 'published') filter.status = status as 'draft' | 'published';

    const posts = await BlogPostModel.find(filter)
      .select('title slug content thumbnailUrl status createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      posts: posts.map((p) => ({
        _id: p._id,
        title: p.title,
        slug: p.slug,
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
