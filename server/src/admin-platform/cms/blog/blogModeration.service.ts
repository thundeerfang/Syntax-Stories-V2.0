import mongoose from "mongoose";
import type { Request } from "express";
import { BlogPostModel } from "../../../models/BlogPost.js";
import { UserModel } from "../../../models/User.js";
import { AuditAction } from "../../../shared/audit/events.js";
import { writeAuditLog } from "../../../shared/audit/auditLog.js";
import { suspendRepostBookmarkContributionsForPost } from "../../../services/blogEngagement.service.js";
import { suspendRespectContributionsForPost } from "../../../services/blogRespect.service.js";
import { sendBlogModerationEmail } from "./blogModerationEmail.js";
import {
  restoreBlogPostAsAdmin,
  TrashServiceError,
} from "../trash/trash.service.js";
import type { AdminErrorCode } from "../../rbac/adminResponse.js";
async function loadPostById(postId: string) {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new BlogModerationError(400, "Invalid post id");
  }
  const post = await BlogPostModel.findById(postId);
  if (!post) throw new BlogModerationError(404, "Blog not found", "NOT_FOUND");
  return post;
}
export class BlogModerationError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: AdminErrorCode = "VALIDATION_ERROR",
  ) {
    super(message);
    this.name = "BlogModerationError";
  }
}
async function loadPostForModeration(postId: string) {
  const post = await loadPostById(postId);
  if (post.deletedAt) {
    throw new BlogModerationError(
      409,
      "Post is in trash — restore it first",
      "CONFLICT",
    );
  }
  return post;
}
async function notifyAuthor(
  authorId: mongoose.Types.ObjectId,
  postTitle: string,
  action: "deleted" | "suspended",
): Promise<void> {
  const user = await UserModel.findById(authorId)
    .select("email fullName username")
    .lean();
  if (!user?.email) return;
  const name = user.fullName?.trim() || user.username || "there";
  await sendBlogModerationEmail({
    to: user.email,
    authorName: name,
    postTitle,
    action,
  });
}
export async function adminSoftDeleteBlog(
  postId: string,
  actorId: string,
  req: Request,
): Promise<{
  id: string;
}> {
  const post = await loadPostForModeration(postId);
  if (post.deletedAt) {
    throw new BlogModerationError(409, "Post is already deleted", "CONFLICT");
  }
  const now = new Date();
  post.deletedAt = now;
  post.deletedById = new mongoose.Types.ObjectId(actorId);
  await post.save();
  await Promise.all([
    suspendRespectContributionsForPost(
      post._id as mongoose.Types.ObjectId,
      post.authorId as mongoose.Types.ObjectId,
    ),
    suspendRepostBookmarkContributionsForPost(
      post._id as mongoose.Types.ObjectId,
    ),
  ]);
  void writeAuditLog(req, AuditAction.ADMIN_BLOG_SOFT_DELETED, {
    actorId,
    targetType: "blog_post",
    targetId: String(post._id),
    metadata: {
      title: post.title,
      slug: post.slug,
      authorId: String(post.authorId),
    },
  });
  void notifyAuthor(
    post.authorId as mongoose.Types.ObjectId,
    post.title,
    "deleted",
  );
  return { id: String(post._id) };
}
export async function adminSuspendBlog(
  postId: string,
  actorId: string,
  req: Request,
): Promise<{
  id: string;
  status: "suspended";
}> {
  const post = await loadPostForModeration(postId);
  if (post.status === "suspended") {
    throw new BlogModerationError(409, "Post is already suspended", "CONFLICT");
  }
  post.status = "suspended";
  post.suspendedAt = new Date();
  post.suspendedById = new mongoose.Types.ObjectId(actorId);
  await post.save();
  await Promise.all([
    suspendRespectContributionsForPost(
      post._id as mongoose.Types.ObjectId,
      post.authorId as mongoose.Types.ObjectId,
    ),
    suspendRepostBookmarkContributionsForPost(
      post._id as mongoose.Types.ObjectId,
    ),
  ]);
  void writeAuditLog(req, AuditAction.ADMIN_BLOG_SUSPENDED, {
    actorId,
    targetType: "blog_post",
    targetId: String(post._id),
    metadata: {
      title: post.title,
      slug: post.slug,
      authorId: String(post.authorId),
    },
  });
  void notifyAuthor(
    post.authorId as mongoose.Types.ObjectId,
    post.title,
    "suspended",
  );
  return { id: String(post._id), status: "suspended" };
}
export async function adminUnsuspendBlog(
  postId: string,
  actorId: string,
  req: Request,
): Promise<{
  id: string;
  status: "draft" | "published";
}> {
  const post = await loadPostForModeration(postId);
  if (post.status !== "suspended") {
    throw new BlogModerationError(409, "Post is not suspended", "CONFLICT");
  }
  const hadPublished =
    post.publishedAt instanceof Date &&
    !Number.isNaN(post.publishedAt.getTime());
  post.status = hadPublished ? "published" : "draft";
  post.suspendedAt = undefined;
  post.suspendedById = undefined;
  await post.save();
  void writeAuditLog(req, AuditAction.ADMIN_BLOG_UNSUSPENDED, {
    actorId,
    targetType: "blog_post",
    targetId: String(post._id),
    metadata: { title: post.title, status: post.status },
  });
  return { id: String(post._id), status: post.status as "draft" | "published" };
}
export async function adminRestoreBlog(
  postId: string,
  actorId: string,
  req: Request,
): Promise<{
  id: string;
  status: string;
}> {
  try {
    await restoreBlogPostAsAdmin(postId, actorId, req);
  } catch (e) {
    if (e instanceof TrashServiceError) {
      throw new BlogModerationError(
        e.status,
        e.message,
        (e.code as AdminErrorCode | undefined) ?? "VALIDATION_ERROR",
      );
    }
    throw e;
  }
  const post = await BlogPostModel.findById(postId).lean();
  return {
    id: postId,
    status: (post?.status as string) ?? "published",
  };
}
