import { Request, Response } from 'express';
import type { AuthUser } from '../middlewares/auth/index.js';
import {
  findEligiblePublishedPostByUsernameSlug,
  setRespectDesiredState,
  viewerRespectStatesForPosts,
} from '../services/blogRespect.service.js';
import { publishBlogPostStatsSnapshot } from '../services/blogStatsPublish.service.js';
import {
  attachAchievementsToResponse,
  dispatchAchievementEvents,
} from '../achievements/achievement.service.js';

function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}

/** POST /api/blog/p/:username/:slug/respect — body `{ "respecting": boolean }` */
export async function setBlogRespect(req: Request, res: Response): Promise<void> {
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
    const body = req.body as { respecting?: unknown };
    if (typeof body.respecting !== 'boolean') {
      res
        .status(400)
        .json({ success: false, message: 'Body must include respecting: true | false' });
      return;
    }

    const found = await findEligiblePublishedPostByUsernameSlug(username, slug);
    if (!found) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    const result = await setRespectDesiredState({
      viewerUserId: user._id,
      postId: found.postId,
      authorId: found.authorId,
      respecting: body.respecting,
    });

    if (!result.ok) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    void publishBlogPostStatsSnapshot(found.postId);

    const events =
      result.newRespectEdge && result.respecting
        ? ([{ type: 'respect_given' as const }] as const)
        : [];
    const [viewerUnlocks, authorUnlocks] = await Promise.all([
      events.length > 0
        ? dispatchAchievementEvents(String(user._id), [...events])
        : Promise.resolve([]),
      result.newRespectEdge && result.respecting
        ? dispatchAchievementEvents(String(found.authorId), [{ type: 'profile_sync' }])
        : Promise.resolve([]),
    ]);

    res.status(200).json(
      attachAchievementsToResponse(
        {
          success: true,
          respecting: result.respecting,
          respectCount: result.respectCount,
          authorBlogRespectReceivedCount: result.authorBlogRespectReceivedCount,
        },
        viewerUnlocks
      )
    );

    if (authorUnlocks.length > 0) {
      // Author unlocks (e.g. respect received) are not shown to the viewer in this response.
      void authorUnlocks;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update Respect' });
  }
}

/** POST /api/blog/respect/viewer-state — body `{ "postIds": string[] }` max 50 */
export async function postBlogRespectViewerState(req: Request, res: Response): Promise<void> {
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
    const viewerRespectStates = await viewerRespectStatesForPosts(user._id, ids);
    res.status(200).json({ success: true, viewerRespectStates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load viewer Respect state' });
  }
}
