import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AuditLogModel } from "../../models/AuditLog.js";
import { AUDIT_DOMAINS, type AuditDomain } from "../../shared/audit/domains.js";
import { sendAdminOk } from "../rbac/adminResponse.js";
export async function listAuditLogs(
  req: Request,
  res: Response,
): Promise<void> {
  const limitRaw = (req.query.limit as string | undefined) ?? "30";
  const limit = Math.max(1, Math.min(Number.parseInt(limitRaw, 10) || 30, 100));
  const cursor = (req.query.cursor as string | undefined)?.trim();
  const actionPrefix = (req.query.actionPrefix as string | undefined)?.trim();
  const actorId = (req.query.actorId as string | undefined)?.trim();
  const targetId = (req.query.targetId as string | undefined)?.trim();
  const userId = (req.query.userId as string | undefined)?.trim();
  const domainRaw = (req.query.domain as string | undefined)?.trim();
  const filter: Record<string, unknown> = {};
  if (domainRaw && (AUDIT_DOMAINS as readonly string[]).includes(domainRaw)) {
    filter.domain = domainRaw as AuditDomain;
  } else {
    filter.domain = "core";
  }
  if (userId && mongoose.isValidObjectId(userId)) {
    const oid = new mongoose.Types.ObjectId(userId);
    filter.$or = [{ actorId: oid }, { targetId: oid }];
  } else if (filter.domain === "core") {
    if (actionPrefix) {
      filter.action = {
        $regex: `^${actionPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      };
    } else {
      filter.action = { $regex: "^(admin\\.|auth\\.)" };
    }
    if (actorId && mongoose.isValidObjectId(actorId)) {
      filter.actorId = new mongoose.Types.ObjectId(actorId);
    }
    if (targetId && mongoose.isValidObjectId(targetId)) {
      filter.targetId = new mongoose.Types.ObjectId(targetId);
    }
  } else if (actionPrefix) {
    filter.action = {
      $regex: `^${actionPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    };
  }
  if (cursor && mongoose.isValidObjectId(cursor)) {
    const cur = await AuditLogModel.findById(cursor).select("timestamp").lean();
    if (cur?.timestamp) {
      filter.timestamp = { $lt: cur.timestamp };
    }
  }
  const rows = await AuditLogModel.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? String(page[page.length - 1]?._id) : null;
  sendAdminOk(res, {
    items: page.map((r) => ({
      id: String(r._id),
      domain: r.domain ?? "core",
      action: r.action,
      actorId: r.actorId ? String(r.actorId) : null,
      targetType: r.targetType ?? null,
      targetId: r.targetId ? String(r.targetId) : null,
      metadata: r.metadata ?? {},
      ip: r.ip ?? null,
      userAgent: r.userAgent ?? null,
      timestamp: r.timestamp?.toISOString?.() ?? null,
    })),
    nextCursor,
  });
}
