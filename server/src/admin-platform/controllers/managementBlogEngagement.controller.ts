import type { Request, Response } from "express";
import mongoose from "mongoose";
import { sendAdminError, sendAdminOk } from "../rbac/adminResponse.js";
import {
  loadBlogEngagement,
  type BlogEngagementMetric,
} from "./managementBlogEngagement.service.js";
const METRICS = new Set<BlogEngagementMetric>([
  "views",
  "respects",
  "comments",
  "reposts",
  "bookmarks",
]);
export async function getBlogEngagementByMetric(
  req: Request,
  res: Response,
): Promise<void> {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  const metricRaw =
    typeof req.params.metric === "string" ? req.params.metric.trim() : "";
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Invalid blog id");
    return;
  }
  if (!METRICS.has(metricRaw as BlogEngagementMetric)) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Invalid engagement metric");
    return;
  }
  const rawLimit = Number(req.query.limit);
  const limit = Math.min(
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 50,
    100,
  );
  const data = await loadBlogEngagement(
    new mongoose.Types.ObjectId(id),
    metricRaw as BlogEngagementMetric,
    limit,
  );
  if (!data) {
    sendAdminError(res, 404, "NOT_FOUND", "Blog not found");
    return;
  }
  sendAdminOk(res, data);
}
