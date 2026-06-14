import type { Request, Response } from "express";
import mongoose from "mongoose";
import { sendAdminError, sendAdminOk } from "../rbac/adminResponse.js";
import {
  listAdminBlogs,
  loadAdminBlogDetail,
  parseBlogListLimit,
} from "./managementBlog.service.js";
export async function listBlogs(req: Request, res: Response): Promise<void> {
  const limit = parseBlogListLimit(req.query.limit);
  const cursor =
    typeof req.query.cursor === "string" ? req.query.cursor.trim() : "";
  const statusRaw =
    typeof req.query.status === "string" ? req.query.status.trim() : "";
  const status =
    statusRaw === "draft" ||
    statusRaw === "published" ||
    statusRaw === "suspended"
      ? statusRaw
      : undefined;
  const q =
    typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : "";
  if (cursor && !mongoose.isValidObjectId(cursor)) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Invalid cursor");
    return;
  }
  const data = await listAdminBlogs({
    limit,
    cursor: cursor ? new mongoose.Types.ObjectId(cursor) : undefined,
    status,
    q: q.length >= 2 ? q : undefined,
  });
  sendAdminOk(res, data);
}
export async function getBlogById(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Invalid blog id");
    return;
  }
  const data = await loadAdminBlogDetail(new mongoose.Types.ObjectId(id));
  if (!data) {
    sendAdminError(res, 404, "NOT_FOUND", "Blog not found");
    return;
  }
  sendAdminOk(res, data);
}
