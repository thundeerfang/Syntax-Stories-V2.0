import { Request, Response } from "express";
import mongoose from "mongoose";
import type { AuthUser } from "../middlewares/auth/index.js";
import type { RequestWithOptionalAuth } from "../middlewares/auth/optionalVerifyToken.js";
import { BlogCommentModel } from "../models/BlogComment.js";
import { BlogPostModel } from "../models/BlogPost.js";
import { publishBlogPostStatsSnapshot } from "../services/blogStatsPublish.service.js";
import { UserModel, normalizeProfileImg } from "../models/User.js";
import { validateBlogCommentText } from "../utils/blogCommentLimits.js";
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}
async function resolvePublishedPost(usernameParam: string, slug: string) {
  const user = await UserModel.findOne({
    username: new RegExp(`^${escapeRegex(usernameParam)}$`, "i"),
  })
    .select("_id")
    .lean();
  if (!user) return null;
  const post = await BlogPostModel.findOne({
    authorId: user._id,
    slug,
    status: "published",
  })
    .select("_id")
    .lean();
  if (!post) return null;
  return { postId: post._id as mongoose.Types.ObjectId };
}
type LeanPopulatedComment = {
  _id: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  userId: unknown;
  parentId?: mongoose.Types.ObjectId | null;
  text: string;
  likedBy?: mongoose.Types.ObjectId[];
  editedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
function populatedAuthorId(c: LeanPopulatedComment): string {
  const u = c.userId as unknown;
  if (u && typeof u === "object" && !Array.isArray(u) && "_id" in u) {
    return String(
      (
        u as {
          _id: mongoose.Types.ObjectId;
        }
      )._id,
    );
  }
  return "";
}
function shapePublicComment(c: LeanPopulatedComment, viewerId?: string) {
  const u = c.userId as unknown;
  let author = { username: "", fullName: "", profileImg: "" };
  let authorUserId = "";
  if (u && typeof u === "object" && !Array.isArray(u)) {
    const o = u as {
      username?: string;
      fullName?: string;
      profileImg?: string;
    };
    authorUserId = populatedAuthorId(c);
    author = {
      username: typeof o.username === "string" ? o.username : "",
      fullName: typeof o.fullName === "string" ? o.fullName : "",
      profileImg: normalizeProfileImg(o.profileImg),
    };
  }
  const liked = c.likedBy ?? [];
  const likeCount = liked.length;
  const likedByViewer = Boolean(
    viewerId && liked.some((id) => String(id) === viewerId),
  );
  const editedAt =
    c.editedAt instanceof Date && !Number.isNaN(c.editedAt.getTime())
      ? c.editedAt
      : null;
  return {
    _id: String(c._id),
    parentId: c.parentId ? String(c.parentId) : null,
    text: c.text,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    editedAt: editedAt ? editedAt.toISOString() : null,
    authorUserId,
    likeCount,
    likedByViewer,
    author,
    directReplyCount: 0,
  };
}
async function attachDirectReplyCounts(
  postId: mongoose.Types.ObjectId,
  comments: ReturnType<typeof shapePublicComment>[],
): Promise<ReturnType<typeof shapePublicComment>[]> {
  if (comments.length === 0) return comments;
  const parentOids = comments.map((c) => new mongoose.Types.ObjectId(c._id));
  const rows = await BlogCommentModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { postId, parentId: { $in: parentOids } } },
    { $group: { _id: "$parentId", count: { $sum: 1 } } },
  ]);
  const countByParent = new Map(
    rows.map((r) => [String(r._id), r.count] as const),
  );
  return comments.map((c) => ({
    ...c,
    directReplyCount: countByParent.get(c._id) ?? 0,
  }));
}
function parseQueryInt(
  raw: string | string[] | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const text = paramString(raw);
  const n = text != null ? Number.parseInt(text, 10) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
export async function listBlogComments(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const usernameParam = paramString(req.params.username);
    const slug = paramString(req.params.slug);
    if (!usernameParam || !slug) {
      res.status(400).json({ success: false, message: "Invalid path" });
      return;
    }
    const resolved = await resolvePublishedPost(usernameParam, slug);
    if (!resolved) {
      res.status(404).json({ success: false, message: "Post not found" });
      return;
    }
    const offset = parseQueryInt(
      req.query.offset as string | string[] | undefined,
      0,
      0,
      10_000,
    );
    const limit = parseQueryInt(
      req.query.limit as string | string[] | undefined,
      10,
      1,
      100,
    );
    const parentIdRaw = paramString(
      req.query.parentId as string | string[] | undefined,
    );
    const rootSort =
      paramString(req.query.sort as string | string[] | undefined) === "newest"
        ? -1
        : 1;
    let parentOid: mongoose.Types.ObjectId | null = null;
    if (
      parentIdRaw != null &&
      parentIdRaw.trim() !== "" &&
      parentIdRaw.trim().toLowerCase() !== "null"
    ) {
      const pid = parentIdRaw.trim();
      if (!mongoose.isValidObjectId(pid)) {
        res.status(400).json({ success: false, message: "Invalid parentId" });
        return;
      }
      parentOid = new mongoose.Types.ObjectId(pid);
      const parent = await BlogCommentModel.findOne({
        _id: parentOid,
        postId: resolved.postId,
      })
        .select("_id")
        .lean();
      if (!parent) {
        res
          .status(404)
          .json({ success: false, message: "Parent comment not found" });
        return;
      }
    }
    const filter =
      parentOid != null
        ? { postId: resolved.postId, parentId: parentOid }
        : { postId: resolved.postId, parentId: null };
    const [rows, total, postTotal] = await Promise.all([
      BlogCommentModel.find(filter)
        .sort({ createdAt: parentOid != null ? 1 : rootSort })
        .skip(offset)
        .limit(limit)
        .populate({
          path: "userId",
          select: "username fullName profileImg",
          model: "users",
        })
        .lean(),
      BlogCommentModel.countDocuments(filter),
      BlogCommentModel.countDocuments({ postId: resolved.postId }),
    ]);
    const viewerId = (req as RequestWithOptionalAuth).authUser?._id;
    const shaped = rows.map((c) =>
      shapePublicComment(c as LeanPopulatedComment, viewerId),
    );
    const comments = await attachDirectReplyCounts(resolved.postId, shaped);
    res.status(200).json({
      success: true,
      comments,
      total,
      postTotal,
      offset,
      limit,
      hasMore: offset + comments.length < total,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load comments" });
  }
}
export async function addBlogComment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const usernameParam = paramString(req.params.username);
    const slug = paramString(req.params.slug);
    if (!usernameParam || !slug) {
      res.status(400).json({ success: false, message: "Invalid path" });
      return;
    }
    const resolved = await resolvePublishedPost(usernameParam, slug);
    if (!resolved) {
      res.status(404).json({ success: false, message: "Post not found" });
      return;
    }
    const body = req.body as {
      text?: string;
      parentId?: string | null;
    };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const commentError = validateBlogCommentText(text);
    if (commentError) {
      res.status(400).json({ success: false, message: commentError });
      return;
    }
    let parentOid: mongoose.Types.ObjectId | null = null;
    if (body.parentId != null && String(body.parentId).trim() !== "") {
      const pid = String(body.parentId).trim();
      if (!mongoose.isValidObjectId(pid)) {
        res
          .status(400)
          .json({ success: false, message: "Invalid parent comment" });
        return;
      }
      const parent = await BlogCommentModel.findOne({
        _id: pid,
        postId: resolved.postId,
      })
        .select("_id")
        .lean();
      if (!parent) {
        res
          .status(400)
          .json({ success: false, message: "Invalid parent comment" });
        return;
      }
      parentOid = new mongoose.Types.ObjectId(pid);
    }
    const doc = await BlogCommentModel.create({
      postId: resolved.postId,
      userId: new mongoose.Types.ObjectId(user._id),
      parentId: parentOid,
      text,
      likedBy: [],
    });
    await BlogPostModel.updateOne(
      { _id: resolved.postId },
      { $inc: { commentCount: 1 } },
    );
    void publishBlogPostStatsSnapshot(resolved.postId);
    const populated = await BlogCommentModel.findById(doc._id)
      .populate({
        path: "userId",
        select: "username fullName profileImg",
        model: "users",
      })
      .lean();
    if (!populated) {
      res
        .status(500)
        .json({ success: false, message: "Failed to create comment" });
      return;
    }
    res.status(201).json({
      success: true,
      comment: shapePublicComment(populated as LeanPopulatedComment, user._id),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to post comment" });
  }
}
async function loadCommentOnPublishedPost(
  usernameParam: string,
  slug: string,
  commentId: string,
): Promise<{
  postId: mongoose.Types.ObjectId;
  comment: LeanPopulatedComment;
} | null> {
  if (!mongoose.isValidObjectId(commentId)) return null;
  const resolved = await resolvePublishedPost(usernameParam, slug);
  if (!resolved) return null;
  const row = await BlogCommentModel.findOne({
    _id: commentId,
    postId: resolved.postId,
  })
    .populate({
      path: "userId",
      select: "username fullName profileImg",
      model: "users",
    })
    .lean();
  if (!row) return null;
  return { postId: resolved.postId, comment: row as LeanPopulatedComment };
}
export async function updateBlogComment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const usernameParam = paramString(req.params.username);
    const slug = paramString(req.params.slug);
    const commentId = paramString(req.params.commentId);
    if (!usernameParam || !slug || !commentId) {
      res.status(400).json({ success: false, message: "Invalid path" });
      return;
    }
    const body = req.body as {
      text?: string;
    };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const commentError = validateBlogCommentText(text);
    if (commentError) {
      res.status(400).json({ success: false, message: commentError });
      return;
    }
    const found = await loadCommentOnPublishedPost(
      usernameParam,
      slug,
      commentId,
    );
    if (!found) {
      res.status(404).json({ success: false, message: "Comment not found" });
      return;
    }
    if (populatedAuthorId(found.comment) !== user._id) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }
    await BlogCommentModel.updateOne(
      { _id: commentId, postId: found.postId },
      { $set: { text, editedAt: new Date() } },
    );
    const fresh = await BlogCommentModel.findById(commentId)
      .populate({
        path: "userId",
        select: "username fullName profileImg",
        model: "users",
      })
      .lean();
    if (!fresh) {
      res
        .status(500)
        .json({ success: false, message: "Failed to update comment" });
      return;
    }
    res.status(200).json({
      success: true,
      comment: shapePublicComment(fresh as LeanPopulatedComment, user._id),
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update comment" });
  }
}
export async function deleteBlogComment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const usernameParam = paramString(req.params.username);
    const slug = paramString(req.params.slug);
    const commentId = paramString(req.params.commentId);
    if (!usernameParam || !slug || !commentId) {
      res.status(400).json({ success: false, message: "Invalid path" });
      return;
    }
    const found = await loadCommentOnPublishedPost(
      usernameParam,
      slug,
      commentId,
    );
    if (!found) {
      res.status(404).json({ success: false, message: "Comment not found" });
      return;
    }
    if (populatedAuthorId(found.comment) !== user._id) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }
    const cid = new mongoose.Types.ObjectId(commentId);
    const childCount = await BlogCommentModel.countDocuments({ parentId: cid });
    await BlogCommentModel.deleteMany({ parentId: cid });
    await BlogCommentModel.deleteOne({ _id: cid, postId: found.postId });
    const removed = childCount + 1;
    if (removed > 0) {
      const postBefore = await BlogPostModel.findById(found.postId)
        .select("commentCount")
        .lean();
      const cur =
        typeof postBefore?.commentCount === "number" &&
        Number.isFinite(postBefore.commentCount)
          ? Math.max(0, Math.floor(postBefore.commentCount))
          : 0;
      const next = Math.max(0, cur - removed);
      await BlogPostModel.updateOne(
        { _id: found.postId },
        { $set: { commentCount: next } },
      );
      void publishBlogPostStatsSnapshot(found.postId);
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete comment" });
  }
}
export async function toggleBlogCommentLike(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const usernameParam = paramString(req.params.username);
    const slug = paramString(req.params.slug);
    const commentId = paramString(req.params.commentId);
    if (!usernameParam || !slug || !commentId) {
      res.status(400).json({ success: false, message: "Invalid path" });
      return;
    }
    const found = await loadCommentOnPublishedPost(
      usernameParam,
      slug,
      commentId,
    );
    if (!found) {
      res.status(404).json({ success: false, message: "Comment not found" });
      return;
    }
    const uid = new mongoose.Types.ObjectId(user._id);
    const doc = await BlogCommentModel.findOne({
      _id: commentId,
      postId: found.postId,
    });
    if (!doc) {
      res.status(404).json({ success: false, message: "Comment not found" });
      return;
    }
    const liked = (doc.likedBy ?? []).some((id) => id.equals(uid));
    if (liked) {
      doc.likedBy = (doc.likedBy ?? []).filter((id) => !id.equals(uid));
    } else {
      doc.likedBy = [...(doc.likedBy ?? []), uid];
    }
    await doc.save();
    const likeCount = doc.likedBy.length;
    res.status(200).json({
      success: true,
      likeCount,
      likedByViewer: !liked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to toggle like" });
  }
}
