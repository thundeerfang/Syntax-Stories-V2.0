import type { Response } from "express";
import mongoose from "mongoose";
import { BLOG_LIMITS } from "@syntax-stories/shared";
import {
  sanitizeThumbnailUrl,
} from "./blogContentValidation.js";
import {
  mapTaxonomyFromDoc,
  type TaxonomyFields,
} from "./blogFeed.mapper.js";
import type { normalizeTaxonomyInput } from "./postTaxonomy.js";
import { BlogPostModel, type IBlogPost } from "../../models/BlogPost.js";
import {
  resumeRepostBookmarkContributionsForPost,
  suspendRepostBookmarkContributionsForPost,
} from "../../services/blogEngagement.service.js";
import {
  resumeRespectContributionsForPost,
  suspendRespectContributionsForPost,
} from "../../services/blogRespect.service.js";
import { assertCanPostOrShareToSquad } from "../../services/squad.service.js";

const SLUG_MAX_LEN = BLOG_LIMITS.slugMaxLen;

export function isEligibleForPublicRespect(doc: {
  status?: string;
  deletedAt?: Date | null;
}): boolean {
  return (
    doc.status === "published" &&
    (doc.deletedAt == null || doc.deletedAt === undefined)
  );
}

export function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replaceAll(/\s+/g, "-")
      .replaceAll(/[^\w-]/g, "")
      .replaceAll(/-+/g, "-")
      .replaceAll(/^-+/g, "")
      .replaceAll(/-+$/g, "")
      .slice(0, 200) || "post"
  );
}

export function taxonomyWriteFields(tax: {
  category?: string;
  categories?: string[];
  tags?: string[];
  language?: string;
}) {
  return {
    category: tax.categories?.length ? tax.categories[0] : tax.category,
    categories: tax.categories?.length ? tax.categories : undefined,
    tags: tax.tags?.length ? tax.tags : undefined,
    language: tax.language ?? "en",
  };
}

export function slugWithCollisionSuffix(base: string, attempt: number): string {
  if (attempt <= 0) return base.slice(0, SLUG_MAX_LEN);
  const suf = `-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const room = SLUG_MAX_LEN - suf.length;
  return `${base.slice(0, Math.max(1, room))}${suf}`;
}

export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

export function postSquadId(
  post: unknown,
): mongoose.Types.ObjectId | null | undefined {
  return (
    (
      post as {
        squadId?: mongoose.Types.ObjectId | null;
      }
    ).squadId ?? null
  );
}

export function mapWritePostResponse(
  post: IBlogPost | Record<string, unknown>,
) {
  const squadId = postSquadId(post);
  return {
    _id: post._id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    content: post.content,
    thumbnailUrl: post.thumbnailUrl,
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    ...(squadId ? { squadId: String(squadId) } : {}),
    ...mapTaxonomyFromDoc(post as TaxonomyFields),
  };
}

export async function createPostWithSlugRetries(
  baseSlug: string,
  buildDoc: (slug: string) => Record<string, unknown>,
): Promise<{ post: IBlogPost | null; lastErr?: unknown }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 12; attempt++) {
    const slug = slugWithCollisionSuffix(baseSlug, attempt);
    try {
      const post = (await BlogPostModel.create(buildDoc(slug))) as IBlogPost;
      return { post };
    } catch (err) {
      lastErr = err;
      if (isDuplicateKeyError(err)) continue;
      throw err;
    }
  }
  return { post: null, lastErr };
}

export function parseNullableSquadId(
  raw: unknown,
): { ok: true; value: mongoose.Types.ObjectId | null } | { ok: false } {
  if (raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw === "string" && mongoose.Types.ObjectId.isValid(raw)) {
    return { ok: true, value: new mongoose.Types.ObjectId(raw) };
  }
  return { ok: false };
}

export async function ensureSquadPostAllowed(
  res: Response,
  squadId: mongoose.Types.ObjectId | null | undefined,
  userId: string,
): Promise<boolean> {
  if (!squadId) return true;
  const gate = await assertCanPostOrShareToSquad({
    squadId,
    userId,
  });
  if (!gate.ok) {
    res.status(gate.status).json({ success: false, message: gate.message });
    return false;
  }
  return true;
}

export function hasBlogTaxonomyKeys(rawBody: Record<string, unknown>): boolean {
  return (
    "category" in rawBody ||
    "categories" in rawBody ||
    "tags" in rawBody ||
    "language" in rawBody
  );
}

export function publishedToDraftForkRequested(args: {
  status?: "draft" | "published";
  existingStatus?: string;
  silent?: boolean;
}): boolean {
  return (
    args.status === "draft" &&
    args.existingStatus === "published" &&
    args.silent !== true
  );
}

function taxonomyForPublishedFork(
  existing: IBlogPost,
  tax: ReturnType<typeof normalizeTaxonomyInput> | null,
  hasTaxonomyKeys: boolean,
) {
  return {
    category: hasTaxonomyKeys ? tax?.category : existing.category,
    tags: hasTaxonomyKeys
      ? tax?.tags?.length
        ? tax.tags
        : undefined
      : existing.tags,
    language: hasTaxonomyKeys
      ? (tax?.language ?? existing.language ?? "en")
      : (existing.language ?? "en"),
  };
}

export async function forkPublishedPostToDraft(args: {
  userId: unknown;
  existing: IBlogPost;
  title: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
  tax: ReturnType<typeof normalizeTaxonomyInput> | null;
  hasTaxonomyKeys: boolean;
}): Promise<{ post: IBlogPost | null; lastErr?: unknown }> {
  const forkTax = taxonomyForPublishedFork(
    args.existing,
    args.tax,
    args.hasTaxonomyKeys,
  );
  return createPostWithSlugRetries(slugify(args.title), (slug) => ({
    authorId: args.userId as mongoose.Types.ObjectId,
    title: args.title,
    slug,
    summary: args.summary || undefined,
    content: args.content,
    thumbnailUrl: args.thumbnailUrl ?? undefined,
    status: "draft",
    ...(forkTax.category ? { category: forkTax.category } : {}),
    ...(forkTax.tags?.length ? { tags: forkTax.tags } : {}),
    language: forkTax.language,
  }));
}

export function applyRequestedSquadAssignment(args: {
  existing: IBlogPost;
  rawBody: Record<string, unknown>;
  wasPublishedBefore: boolean;
}): { ok: true } | { ok: false; status: number; message: string } {
  if (!("squadId" in args.rawBody)) return { ok: true };
  const parsedSquad = parseNullableSquadId(args.rawBody.squadId);
  if (!parsedSquad.ok) {
    return { ok: false, status: 400, message: "Invalid squadId" };
  }
  const nextSquadId = parsedSquad.value;
  const prevSquad = postSquadId(args.existing);
  const unchanged =
    (prevSquad == null && nextSquadId == null) ||
    (prevSquad != null &&
      nextSquadId != null &&
      String(prevSquad) === String(nextSquadId));
  if (unchanged) return { ok: true };
  if (args.wasPublishedBefore && prevSquad) {
    return {
      ok: false,
      status: 409,
      message: "Squad assignment cannot be changed on a published post",
    };
  }
  args.existing.set("squadId", nextSquadId);
  return { ok: true };
}

export async function resolveSlugForTitleUpdate(args: {
  existing: IBlogPost;
  userId: unknown;
  title?: string;
  titleStr: string;
}): Promise<string> {
  if (
    typeof args.title !== "string" ||
    !args.title.trim() ||
    args.titleStr === args.existing.title
  ) {
    return args.existing.slug;
  }
  const base = slugify(args.titleStr);
  for (let attempt = 0; attempt < 12; attempt++) {
    const cand = slugWithCollisionSuffix(base, attempt);
    const clash = await BlogPostModel.findOne({
      authorId: args.userId,
      slug: cand,
      _id: { $ne: args.existing._id },
    })
      .select("_id")
      .lean();
    if (!clash) return cand;
  }
  return args.existing.slug;
}

export function applyEditablePostFields(args: {
  existing: IBlogPost;
  userId: unknown;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
  status?: "draft" | "published";
  silent?: boolean;
  wasPublishedBefore: boolean;
  tax: ReturnType<typeof normalizeTaxonomyInput> | null;
}): void {
  const { existing } = args;
  existing.title = args.title;
  existing.slug = args.slug;
  existing.summary = args.summary || undefined;
  existing.content = args.content;
  if (args.thumbnailUrl !== undefined) {
    existing.thumbnailUrl = sanitizeThumbnailUrl(args.thumbnailUrl) ?? undefined;
  }
  if (args.status === "draft" || args.status === "published") {
    existing.status = args.status;
    if (args.status === "published") {
      existing.suspendedAt = undefined;
      existing.suspendedById = undefined;
    }
  }
  if (args.tax) {
    const fields = taxonomyWriteFields(args.tax);
    existing.category = fields.category;
    existing.categories = fields.categories;
    existing.tags = fields.tags;
    existing.language = fields.language ?? "en";
  }
  if (!args.wasPublishedBefore && existing.status === "published") {
    if (
      !(existing.publishedAt instanceof Date) ||
      Number.isNaN(existing.publishedAt.getTime())
    ) {
      existing.publishedAt = new Date();
    }
  }
  if (args.silent !== true && args.wasPublishedBefore) {
    existing.lastEditedById = args.userId as mongoose.Types.ObjectId;
    existing.lastEditedAt = new Date();
  }
}

export async function syncPostEngagementEligibility(
  existing: IBlogPost,
  wasEligibleRespect: boolean,
  willBeEligibleRespect: boolean,
): Promise<void> {
  if (wasEligibleRespect && !willBeEligibleRespect) {
    await Promise.all([
      suspendRespectContributionsForPost(
        existing._id as mongoose.Types.ObjectId,
        existing.authorId as mongoose.Types.ObjectId,
      ),
      suspendRepostBookmarkContributionsForPost(
        existing._id as mongoose.Types.ObjectId,
      ),
    ]);
  }
  if (!wasEligibleRespect && willBeEligibleRespect) {
    await Promise.all([
      resumeRespectContributionsForPost(
        existing._id as mongoose.Types.ObjectId,
        existing.authorId as mongoose.Types.ObjectId,
      ),
      resumeRepostBookmarkContributionsForPost(
        existing._id as mongoose.Types.ObjectId,
      ),
    ]);
  }
}
