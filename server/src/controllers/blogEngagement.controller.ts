import { Request, Response } from 'express';
import type { AuthUser } from '../middlewares/auth/index.js';
import { publishBlogPostStatsSnapshot } from '../services/blogStatsPublish.service.js';
import { findEligiblePublishedPostByUsernameSlug } from '../services/blogRespect.service.js';
import {
  setBookmarkDesiredState,
  setRepostDesiredState,
  viewerBookmarkStatesForPosts,
  viewerRepostStatesForPosts,
} from '../services/blogEngagement.service.js';
import { viewerRespectStatesForPosts } from '../services/blogRespect.service.js';

function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}

/** POST /api/blog/p/:username/:slug/repost — body `{ "reposting": boolean }` */
export async function setBlogRepost(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const username = paramString(req.params.username);
    const slug = paramString(req.params.slug);
    if (!username?.trim() || !slug?.trim()) {
      res.status(400).json({ success: false, message: 'Invalid path' });
      return;
    }
    const body = req.body as { reposting?: unknown };
    if (typeof body.reposting !== 'boolean') {
      res.status(400).json({ success: false, message: 'Body must include reposting: true | false' });
      return;
    }

    const found = await findEligiblePublishedPostByUsernameSlug(username, slug);
    if (!found) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    const result = await setRepostDesiredState({
      viewerUserId: user._id,
      postId: found.postId,
      authorId: found.authorId,
      reposting: body.reposting,
    });

    if (!result.ok) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    void publishBlogPostStatsSnapshot(found.postId);

    res.status(200).json({
      success: true,
      reposting: result.reposting,
      repostCount: result.repostCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update repost' });
  }
}

/** POST /api/blog/p/:username/:slug/bookmark — body `{ "bookmarked": boolean }` */
export async function setBlogBookmark(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const username = paramString(req.params.username);
    const slug = paramString(req.params.slug);
    if (!username?.trim() || !slug?.trim()) {
      res.status(400).json({ success: false, message: 'Invalid path' });
      return;
    }
    const body = req.body as { bookmarked?: unknown; groupId?: unknown };
    if (typeof body.bookmarked !== 'boolean') {
      res.status(400).json({ success: false, message: 'Body must include bookmarked: true | false' });
      return;
    }
    const groupIdHex = typeof body.groupId === 'string' ? body.groupId.trim() : undefined;

    const found = await findEligiblePublishedPostByUsernameSlug(username, slug);
    if (!found) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    const result = await setBookmarkDesiredState({
      viewerUserId: user._id,
      postId: found.postId,
      authorId: found.authorId,
      bookmarked: body.bookmarked,
      groupIdHex: groupIdHex || null,
    });

    if (!result.ok) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    void publishBlogPostStatsSnapshot(found.postId);

    res.status(200).json({
      success: true,
      bookmarked: result.bookmarked,
      bookmarkCount: result.bookmarkCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update bookmark' });
  }
}

/** POST /api/blog/engagement/viewer-state — body `{ "postIds": string[] }` max 50 */
export async function postBlogEngagementViewerState(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const body = req.body as { postIds?: unknown };
    if (!Array.isArray(body.postIds)) {
      res.status(400).json({ success: false, message: 'postIds must be an array' });
      return;
    }
    const ids = body.postIds.filter((x): x is string => typeof x === 'string').slice(0, 50);
    const [viewerRespectStates, viewerRepostStates, viewerBookmarkStates] = await Promise.all([
      viewerRespectStatesForPosts(user._id, ids),
      viewerRepostStatesForPosts(user._id, ids),
      viewerBookmarkStatesForPosts(user._id, ids),
    ]);
    res.status(200).json({
      success: true,
      viewerRespectStates,
      viewerRepostStates,
      viewerBookmarkStates,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load viewer engagement state' });
  }
}
