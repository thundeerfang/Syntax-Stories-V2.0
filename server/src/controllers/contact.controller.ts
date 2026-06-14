import { Request, Response } from "express";
import mongoose from "mongoose";
import { ContactLeadModel } from "../models/ContactLead.js";
import { UserModel } from "../models/User.js";
import type { RequestWithOptionalAuth } from "../middlewares/auth/optionalVerifyToken.js";
import { formatDateTimeIst, istTimeZoneLabel } from "../utils/ist.js";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function clientIp(req: Request): string | undefined {
  const xff = req.headers["x-forwarded-for"];
  const raw =
    typeof xff === "string"
      ? xff.split(",")[0]?.trim()
      : Array.isArray(xff)
        ? xff[0]?.trim()
        : "";
  if (raw) return raw.slice(0, 200);
  const ip = req.ip || req.socket?.remoteAddress;
  return typeof ip === "string" ? ip.slice(0, 200) : undefined;
}
function forwardedForHeader(req: Request): string | undefined {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.slice(0, 500);
  if (Array.isArray(xff)) return xff.join(", ").slice(0, 500);
  return undefined;
}
function uaHeader(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua.slice(0, 1024) : undefined;
}
function parseClientMeta(raw: unknown): Record<string, unknown> | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return Object.keys(o).length ? o : undefined;
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (typeof p === "object" && p !== null && !Array.isArray(p)) {
        const o = p as Record<string, unknown>;
        return Object.keys(o).length ? o : undefined;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}
export async function submitContactLead(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const hp = typeof body._hp === "string" ? body._hp.trim() : "";
    if (hp.length > 0) {
      res.status(200).json({ success: true });
      return;
    }
    const r = req as RequestWithOptionalAuth;
    const auth = r.authUser;
    const isAuthed = Boolean(auth?._id);
    const submittedAtIst = formatDateTimeIst();
    const ip = clientIp(req);
    const forwardedFor = forwardedForHeader(req);
    const userAgent = uaHeader(req);
    const istTimeZone = istTimeZoneLabel();
    const serverMeta = {
      submittedAtIst,
      ip,
      forwardedFor,
      userAgent,
      istTimeZone,
    };
    const clientMeta = parseClientMeta(body.clientMeta);
    let fullName: string;
    let email: string;
    let company: string | undefined;
    const topicRaw = typeof body.topic === "string" ? body.topic.trim() : "";
    const messageRaw =
      typeof body.message === "string" ? body.message.trim() : "";
    let userId: mongoose.Types.ObjectId | undefined;
    let username: string | undefined;
    if (isAuthed) {
      const u = await UserModel.findById(auth!._id)
        .select("fullName email username")
        .lean();
      if (!u) {
        res
          .status(401)
          .json({
            success: false,
            message: "Session invalid. Please sign in again.",
          });
        return;
      }
      fullName =
        typeof u.fullName === "string" ? u.fullName.trim().slice(0, 120) : "";
      email =
        typeof u.email === "string"
          ? u.email.trim().toLowerCase().slice(0, 254)
          : "";
      if (!fullName) {
        res.status(400).json({ success: false, message: "Name is required." });
        return;
      }
      if (!email || !EMAIL_RE.test(email)) {
        res
          .status(400)
          .json({
            success: false,
            message: "Account email missing or invalid.",
          });
        return;
      }
      username =
        typeof u.username === "string" ? u.username.slice(0, 64) : undefined;
      userId = new mongoose.Types.ObjectId(auth!._id);
      const co =
        typeof body.company === "string"
          ? body.company.trim().slice(0, 120)
          : "";
      company = co.length ? co : undefined;
    } else {
      const fn = typeof body.fullName === "string" ? body.fullName.trim() : "";
      const em =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const co =
        typeof body.company === "string"
          ? body.company.trim().slice(0, 120)
          : "";
      if (!fn || fn.length < 2) {
        res
          .status(400)
          .json({ success: false, message: "Please enter your full name." });
        return;
      }
      if (!em || !EMAIL_RE.test(em) || em.length > 254) {
        res
          .status(400)
          .json({ success: false, message: "Please enter a valid email." });
        return;
      }
      fullName = fn.slice(0, 120);
      email = em;
      company = co.length ? co : undefined;
    }
    if (!topicRaw || topicRaw.length < 2) {
      res
        .status(400)
        .json({ success: false, message: "Please enter a subject or topic." });
      return;
    }
    if (!messageRaw || messageRaw.length < 10) {
      res
        .status(400)
        .json({
          success: false,
          message: "Message must be at least 10 characters.",
        });
      return;
    }
    const doc = await ContactLeadModel.create({
      fullName,
      email,
      company,
      topic: topicRaw.slice(0, 200),
      message: messageRaw.slice(0, 5000),
      userId,
      username,
      clientMeta,
      serverMeta,
    });
    res.status(201).json({ success: true, id: String(doc._id) });
  } catch (err) {
    console.error("[contact] submitContactLead", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Could not send your message. Try again later.",
      });
  }
}
