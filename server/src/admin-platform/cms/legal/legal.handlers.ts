import crypto from "node:crypto";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthUser } from "../../../middlewares/auth/index.js";
import {
  DataDeletionRequestModel,
  LegalAcceptIntentModel,
  LegalPolicyModel,
  LegalPolicyRevisionModel,
  UserLegalAcceptanceModel,
} from "./models/legal.models.js";
import {
  legalKindParamSchema,
  type AcceptPolicyKind,
  type LegalKind,
} from "./legalKinds.js";
import {
  getPublishedPolicyResponse,
  getRequiredVersionsForUser,
} from "./legalPolicyQueries.js";
import { getLegalDbNow } from "./legalDbTime.js";
import { verifyRevisionHash } from "./legalContentHash.js";
import { completeWithIdempotency } from "./legalIdempotency.service.js";
import {
  publishPolicyRevision,
  assertSlugMatchesKind,
} from "./legalPublish.service.js";
import { env } from "../../../config/env.js";
import { legalJobQueue } from "./legalJobQueue.js";
import { ACCEPT_POLICY_KINDS } from "../../../variable/constants.js";
const acceptBodySchema = z.object({
  policyKind: z.enum(ACCEPT_POLICY_KINDS),
  version: z.number().int().positive(),
  revisionId: z.string().uuid(),
  nonce: z.string().min(16),
  contentHash: z.string().optional(),
});
const deletionBodySchema = z.object({
  message: z.string().max(2000).optional(),
});
function userId(req: Request): string {
  return (
    req as Request & {
      user: AuthUser;
    }
  ).user._id;
}
export async function getPublishedPolicyByKind(
  req: Request,
  res: Response,
): Promise<void> {
  const parse = legalKindParamSchema.safeParse(req.params.kind);
  if (!parse.success) {
    res
      .status(400)
      .json({ ok: false, code: "LEGAL_INVALID_KIND", message: "Invalid kind" });
    return;
  }
  const kind = parse.data;
  const data = await getPublishedPolicyResponse(kind);
  if (!data) {
    res
      .status(404)
      .json({
        ok: false,
        code: "LEGAL_NOT_FOUND",
        message: "No published policy",
      });
    return;
  }
  const { policy, revision } = data;
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, stale-while-revalidate=300",
  );
  res.status(200).json({
    ok: true,
    kind,
    slug: policy.slug,
    version: revision.version,
    revisionId: revision.revisionId,
    title: revision.title,
    summary: revision.summary,
    body: revision.body,
    bodyFormat: revision.bodyFormat,
    publishedAt: revision.publishedAt?.toISOString() ?? null,
    effectiveAt: revision.effectiveAt?.toISOString() ?? null,
    region: policy.region,
    locale: policy.locale,
    isMajor: revision.isMajor,
    contactEmail: revision.contactEmail ?? policy.contactEmail,
    companyName: revision.companyName ?? policy.companyName,
    contentHash: revision.contentHash,
  });
}
export async function postAcceptIntent(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = userId(req);
  const body = z
    .object({
      policyKind: z.enum(ACCEPT_POLICY_KINDS),
      revisionId: z.string().uuid(),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(422).json({ ok: false, message: "Invalid body" });
    return;
  }
  const data = await getPublishedPolicyResponse(
    body.data.policyKind as LegalKind,
  );
  if (!data || data.revision.revisionId !== body.data.revisionId) {
    res.status(409).json({
      ok: false,
      code: "LEGAL_REVISION_NOT_CURRENT",
      message: "Revision is not the current published document.",
    });
    return;
  }
  const now = await getLegalDbNow();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
  const nonce = crypto.randomUUID();
  await LegalAcceptIntentModel.create({
    userId: new mongoose.Types.ObjectId(uid),
    revisionId: body.data.revisionId,
    nonce,
    expiresAt,
  });
  res.status(200).json({
    ok: true,
    nonce,
    expiresAt: expiresAt.toISOString(),
    revisionId: body.data.revisionId,
  });
}
export async function postAccept(req: Request, res: Response): Promise<void> {
  const uid = userId(req);
  const parsed = acceptBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(422)
      .json({
        ok: false,
        message: "Validation failed",
        issues: parsed.error.flatten(),
      });
    return;
  }
  const b = parsed.data;
  await completeWithIdempotency(
    req,
    res,
    "POST /legal/accept",
    uid,
    req.body,
    async () => {
      const intent = await LegalAcceptIntentModel.findOne({
        userId: new mongoose.Types.ObjectId(uid),
        revisionId: b.revisionId,
        nonce: b.nonce,
        consumedAt: { $exists: false },
      }).exec();
      const now = await getLegalDbNow();
      if (!intent || intent.expiresAt <= now) {
        return {
          status: 401,
          body: {
            ok: false,
            code: "LEGAL_ACCEPT_INTENT_INVALID",
            message: "Missing or expired accept intent (replay protection).",
          },
        };
      }
      const pub = await getPublishedPolicyResponse(b.policyKind as LegalKind);
      if (!pub) {
        return {
          status: 404,
          body: {
            ok: false,
            code: "LEGAL_NOT_FOUND",
            message: "No published policy",
          },
        };
      }
      const display = pub.revision;
      if (
        display.revisionId !== b.revisionId ||
        display.version !== b.version
      ) {
        return {
          status: 409,
          body: {
            ok: false,
            code: "LEGAL_VERSION_MISMATCH",
            requiredVersion: display.version,
            message: "Policy changed; refresh and accept again.",
          },
        };
      }
      if (b.contentHash && b.contentHash !== display.contentHash) {
        return {
          status: 409,
          body: {
            ok: false,
            code: "LEGAL_HASH_MISMATCH",
            message: "Content hash does not match server revision.",
          },
        };
      }
      if (
        !verifyRevisionHash({
          title: display.title,
          summary: display.summary,
          body: display.body,
          contentHash: display.contentHash,
        })
      ) {
        return {
          status: 500,
          body: {
            ok: false,
            message: "Server integrity error for revision hash.",
          },
        };
      }
      const acceptedAt = now;
      try {
        await UserLegalAcceptanceModel.create({
          userId: new mongoose.Types.ObjectId(uid),
          policyKind: b.policyKind as AcceptPolicyKind,
          version: b.version,
          revisionId: b.revisionId,
          contentHash: display.contentHash,
          acceptedAt,
          ipAddress: req.ip,
          userAgent: req.get("user-agent") ?? undefined,
          source: "api",
        });
      } catch (e: unknown) {
        if (
          (
            e as {
              code?: number;
            }
          ).code === 11000
        ) {
          const existing = await UserLegalAcceptanceModel.findOne({
            userId: new mongoose.Types.ObjectId(uid),
            policyKind: b.policyKind,
            revisionId: b.revisionId,
          })
            .lean()
            .exec();
          if (existing) {
            return {
              status: 200,
              body: {
                ok: true,
                accepted: true,
                userId: uid,
                policyKind: b.policyKind,
                version: b.version,
                revisionId: b.revisionId,
                acceptedAt: existing.acceptedAt.toISOString(),
              },
            };
          }
        }
        throw e;
      }
      intent.consumedAt = acceptedAt;
      await intent.save();
      return {
        status: 200,
        body: {
          ok: true,
          accepted: true,
          userId: uid,
          policyKind: b.policyKind,
          version: b.version,
          revisionId: b.revisionId,
          acceptedAt: acceptedAt.toISOString(),
        },
      };
    },
  );
}
export async function getMeLegalStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = userId(req);
  const now = await getLegalDbNow();
  const s = await getRequiredVersionsForUser(uid, now);
  res.status(200).json({ ok: true, terms: s.terms, privacy: s.privacy });
}
export async function postDataDeletionRequest(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = userId(req);
  const parsed = deletionBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(422).json({ ok: false, message: "Invalid body" });
    return;
  }
  await completeWithIdempotency(
    req,
    res,
    "POST /legal/data-deletion-requests",
    uid,
    req.body ?? {},
    async () => {
      const now = await getLegalDbNow();
      const open = await DataDeletionRequestModel.findOne({
        userId: new mongoose.Types.ObjectId(uid),
        status: { $in: ["requested", "processing"] },
      }).exec();
      if (open) {
        return {
          status: 409,
          body: {
            ok: false,
            code: "LEGAL_DELETION_OPEN",
            message: "A deletion request is already open.",
          },
        };
      }
      const cooldownHours = env.LEGAL_DELETION_COOLDOWN_HOURS;
      const since = new Date(now.getTime() - cooldownHours * 3600 * 1000);
      const recent = await DataDeletionRequestModel.findOne({
        userId: new mongoose.Types.ObjectId(uid),
        requestedAt: { $gte: since },
      }).exec();
      if (recent) {
        const retryAfterSec = Math.ceil(
          (recent.requestedAt.getTime() +
            cooldownHours * 3600 * 1000 -
            now.getTime()) /
            1000,
        );
        return {
          status: 429,
          body: {
            ok: false,
            code: "LEGAL_DELETION_COOLDOWN",
            retryAfterSec: Math.max(1, retryAfterSec),
          },
        };
      }
      const slaDays = env.LEGAL_DELETION_SLA_DAYS;
      const slaDeadline = new Date(now.getTime() + slaDays * 24 * 3600 * 1000);
      const doc = await DataDeletionRequestModel.create({
        userId: new mongoose.Types.ObjectId(uid),
        status: "requested",
        requestedAt: now,
        legalHold: false,
        slaDeadline,
        slaBreached: false,
        compensationStatus: "none",
        userNote: parsed.data.message,
      });
      legalJobQueue.push({
        type: "DATA_DELETION_PROCESS",
        requestId: doc._id.toString(),
      });
      return {
        status: 201,
        body: {
          ok: true,
          id: doc._id.toString(),
          status: doc.status,
          requestedAt: doc.requestedAt.toISOString(),
        },
      };
    },
  );
}
export async function listMyDeletionRequests(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = userId(req);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20),
  );
  const items = await DataDeletionRequestModel.find({
    userId: new mongoose.Types.ObjectId(uid),
  })
    .sort({ requestedAt: -1 })
    .limit(limit)
    .select("status requestedAt completedAt")
    .lean();
  res.status(200).json({
    ok: true,
    items: items.map((i) => ({
      id: i._id.toString(),
      status: i.status,
      requestedAt: i.requestedAt?.toISOString(),
      completedAt: i.completedAt?.toISOString() ?? null,
    })),
  });
}
const patchPolicySchema = z.object({
  action: z.enum([
    "save_draft",
    "submit_review",
    "approve",
    "publish",
    "archive",
    "start_draft",
    "discard_draft",
  ]),
  title: z.string().optional(),
  summary: z.string().optional(),
  body: z.string().optional(),
  changeLog: z.string().optional(),
  isMajor: z.boolean().optional(),
  effectiveAt: z.string().datetime().optional().nullable(),
  contactEmail: z.string().optional(),
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  expectedPublishedRevisionId: z.string().uuid().optional().nullable(),
});
export async function adminBootstrapPolicies(
  _req: Request,
  res: Response,
): Promise<void> {
  const { ensureLegalPoliciesSeed } =
    await import("./ensureLegalPoliciesSeed.js");
  await ensureLegalPoliciesSeed();
  const items = await LegalPolicyModel.find({
    deletedAt: null,
    tenantId: null,
    productId: null,
  })
    .select("-body -searchIndex")
    .sort({ kind: 1 })
    .lean();
  res.status(200).json({ ok: true, items });
}
export async function adminListPolicies(
  _req: Request,
  res: Response,
): Promise<void> {
  const items = await LegalPolicyModel.find({
    deletedAt: null,
    tenantId: null,
    productId: null,
  })
    .select("-body -searchIndex")
    .sort({ kind: 1 })
    .lean();
  res.status(200).json({ ok: true, items });
}
export async function adminGetPolicy(
  req: Request,
  res: Response,
): Promise<void> {
  const p = await LegalPolicyModel.findById(String(req.params.policyId)).exec();
  if (!p) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.status(200).json({ ok: true, policy: p.toObject() });
}
export async function adminListRevisions(
  req: Request,
  res: Response,
): Promise<void> {
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.limit ?? "50"), 10) || 50),
  );
  const policyId = String(req.params.policyId);
  const revs = await LegalPolicyRevisionModel.find({
    policyId: new mongoose.Types.ObjectId(policyId),
  })
    .sort({ version: -1 })
    .limit(limit)
    .lean();
  res.status(200).json({ ok: true, items: revs });
}
export async function adminGetRevision(
  req: Request,
  res: Response,
): Promise<void> {
  const policyId = String(req.params.policyId);
  const revisionId = String(req.params.revisionId);
  const rev = await LegalPolicyRevisionModel.findOne({
    policyId: new mongoose.Types.ObjectId(policyId),
    revisionId,
  }).lean();
  if (!rev) {
    res.status(404).json({ ok: false, message: "Revision not found" });
    return;
  }
  res.status(200).json({ ok: true, revision: rev });
}
export async function adminDeleteRevision(
  req: Request,
  res: Response,
): Promise<void> {
  const policyId = String(req.params.policyId);
  const revisionId = String(req.params.revisionId);
  const policy = await LegalPolicyModel.findById(policyId).exec();
  if (!policy) {
    res.status(404).json({ ok: false, message: "Policy not found" });
    return;
  }
  if (policy.publishedRevisionId === revisionId) {
    res.status(409).json({
      ok: false,
      message: "Cannot delete the live published revision",
    });
    return;
  }
  const rev = await LegalPolicyRevisionModel.findOne({
    policyId: policy._id,
    revisionId,
  }).exec();
  if (!rev) {
    res.status(404).json({ ok: false, message: "Revision not found" });
    return;
  }
  if (rev.status === "published") {
    res.status(409).json({
      ok: false,
      message:
        "Cannot delete a published revision. Supersede it by publishing a newer version first.",
    });
    return;
  }
  await LegalPolicyRevisionModel.deleteOne({ _id: rev._id });
  res.status(200).json({ ok: true });
}
export async function adminPatchPolicy(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = (
    req as Request & {
      user: AuthUser;
    }
  ).user._id;
  const parsed = patchPolicySchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(422)
      .json({
        ok: false,
        message: "Invalid body",
        issues: parsed.error.flatten(),
      });
    return;
  }
  const b = parsed.data;
  const policy = await LegalPolicyModel.findById(
    String(req.params.policyId),
  ).exec();
  if (!policy) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  if (b.action === "publish") {
    await completeWithIdempotency(
      req,
      res,
      "PATCH /admin/legal/publish",
      uid,
      req.body,
      async () => {
        if (policy.status !== "approved" && policy.status !== "published") {
          return {
            status: 409,
            body: {
              ok: false,
              message: "Publish requires approved or published policy",
            },
          };
        }
        try {
          assertSlugMatchesKind(policy.kind as LegalKind, policy.slug);
        } catch {
          return {
            status: 400,
            body: {
              ok: false,
              code: "SLUG_KIND_MISMATCH",
              message: "Slug does not match kind",
            },
          };
        }
        const title = b.title ?? policy.title;
        const summary = b.summary ?? policy.summary;
        const bodyStr = b.body ?? policy.body;
        const changeLog = b.changeLog ?? policy.changeLog ?? "Publish";
        const isMajor = b.isMajor ?? policy.isMajor ?? false;
        const effectiveAt =
          b.effectiveAt !== undefined && b.effectiveAt !== null
            ? new Date(b.effectiveAt)
            : policy.effectiveAt;
        const pub = await publishPolicyRevision({
          policy,
          draft: {
            title,
            summary,
            body: bodyStr,
            bodyFormat: policy.bodyFormat,
            changeLog,
            isMajor,
            effectiveAt: effectiveAt ?? undefined,
            contactEmail: b.contactEmail ?? policy.contactEmail ?? undefined,
            companyName: b.companyName ?? policy.companyName ?? undefined,
            companyAddress:
              b.companyAddress ?? policy.companyAddress ?? undefined,
            publishedById: new mongoose.Types.ObjectId(uid),
            expectedPublishedRevisionId: b.expectedPublishedRevisionId,
          },
        });
        if (!pub.ok) {
          return {
            status: 409,
            body: { ok: false, code: pub.code, message: pub.message },
          };
        }
        const fresh = await LegalPolicyModel.findById(policy._id).exec();
        return {
          status: 200,
          body: {
            ok: true,
            revisionId: pub.revisionId,
            publishTransactionId: pub.publishTransactionId,
            version: pub.version,
            policy: fresh?.toObject(),
          },
        };
      },
    );
    return;
  }
  if (b.action === "save_draft") {
    if (b.title !== undefined) policy.title = b.title;
    if (b.summary !== undefined) policy.summary = b.summary;
    if (b.body !== undefined) policy.body = b.body;
    if (b.changeLog !== undefined) policy.changeLog = b.changeLog;
    if (b.isMajor !== undefined) policy.isMajor = b.isMajor;
    if (b.effectiveAt !== undefined)
      policy.effectiveAt = b.effectiveAt ? new Date(b.effectiveAt) : undefined;
    if (b.contactEmail !== undefined) policy.contactEmail = b.contactEmail;
    if (b.companyName !== undefined) policy.companyName = b.companyName;
    if (b.companyAddress !== undefined)
      policy.companyAddress = b.companyAddress;
    if (policy.status === "archived") {
      res
        .status(409)
        .json({ ok: false, message: "Cannot edit archived policy" });
      return;
    }
    await policy.save();
    res.status(200).json({ ok: true, policy: policy.toObject() });
    return;
  }
  if (b.action === "submit_review") {
    if (policy.status !== "draft") {
      res.status(409).json({ ok: false, message: "Invalid transition" });
      return;
    }
    policy.status = "in_review";
    await policy.save();
    res.status(200).json({ ok: true, policy: policy.toObject() });
    return;
  }
  if (b.action === "approve") {
    if (policy.status !== "in_review") {
      res.status(409).json({ ok: false, message: "Invalid transition" });
      return;
    }
    policy.status = "approved";
    policy.approvedById = new mongoose.Types.ObjectId(uid);
    policy.approvedAt = new Date();
    await policy.save();
    res.status(200).json({ ok: true, policy: policy.toObject() });
    return;
  }
  if (b.action === "archive") {
    policy.status = "archived";
    await policy.save();
    res.status(200).json({ ok: true, policy: policy.toObject() });
    return;
  }
  if (b.action === "start_draft") {
    const latestPublished = await LegalPolicyRevisionModel.findOne({
      policyId: policy._id,
      status: "published",
    })
      .sort({ version: -1 })
      .lean();
    if (latestPublished) {
      policy.title = latestPublished.title;
      policy.summary = latestPublished.summary ?? "";
      policy.body = latestPublished.body;
      policy.bodyFormat = latestPublished.bodyFormat ?? policy.bodyFormat;
      policy.changeLog = policy.changeLog ?? "New draft from published version";
    } else {
      policy.changeLog = policy.changeLog ?? "New draft";
    }
    policy.status = "draft";
    policy.reviewedById = undefined;
    policy.reviewedAt = undefined;
    policy.approvedById = undefined;
    policy.approvedAt = undefined;
    await policy.save();
    res.status(200).json({ ok: true, policy: policy.toObject() });
    return;
  }
  if (b.action === "discard_draft") {
    const latestPublished = await LegalPolicyRevisionModel.findOne({
      policyId: policy._id,
      status: "published",
    })
      .sort({ version: -1 })
      .lean();
    if (latestPublished) {
      policy.title = latestPublished.title;
      policy.summary = latestPublished.summary ?? "";
      policy.body = latestPublished.body;
      policy.bodyFormat = latestPublished.bodyFormat ?? policy.bodyFormat;
      policy.status = "published";
      policy.publishedRevisionId = latestPublished.revisionId;
      policy.publishedAt = latestPublished.publishedAt ?? policy.publishedAt;
      policy.version = latestPublished.version;
    } else {
      policy.title = policy.title || "Untitled";
      policy.summary = "";
      policy.body = "";
      policy.status = "draft";
      policy.version = 0;
      policy.publishedRevisionId = undefined;
      policy.publishedAt = undefined;
    }
    await policy.save();
    res.status(200).json({ ok: true, policy: policy.toObject() });
    return;
  }
  res.status(400).json({ ok: false, message: "Unknown action" });
}
