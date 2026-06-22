import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { getRedis } from "../../config/redis.js";
import { BlogPostModel } from "../../models/BlogPost.js";
import { BlogReadDayModel } from "../../models/BlogReadDay.js";
import { UserModel } from "../../models/User.js";
import { bumpReadStreakLongestFromMongo } from "../../services/readStreakDurability.service.js";
import {
  readDayZsetScoreMs,
  readDaysTrimMinRetainMsUtc,
} from "../../services/readStreakZset.js";
import { evalReadViewCommitMerged } from "../../services/readViewCommitRedis.js";
import { NOT_DELETED_FILTER } from "../../shared/db/notDeleted.js";
import { redisKeys } from "../../shared/redis/keys.js";
import { streakUtcDayBucket } from "../../streak/calendarUtc.js";
import {
  MIN_READ_COMMIT_DWELL_MS,
  READ_VIEW_ACK_TTL_SEC,
  READ_VIEW_SESSION_TTL_SEC,
} from "../../variable/constants.js";

type RedisClient = NonNullable<ReturnType<typeof getRedis>>;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}

export function readViewSessionId(body: unknown): string {
  return typeof (body as { sessionId?: unknown })?.sessionId === "string"
    ? String((body as { sessionId: string }).sessionId).trim()
    : "";
}

export function readViewPathParams(req: Request): {
  usernameParam?: string;
  slug?: string;
} {
  return {
    usernameParam: paramString(req.params.username),
    slug: paramString(req.params.slug),
  };
}

export async function findReadViewAuthor(usernameParam: string): Promise<{
  _id: mongoose.Types.ObjectId;
} | null> {
  return UserModel.findOne({
    username: new RegExp(`^${escapeRegex(usernameParam)}$`, "i"),
  })
    .select("_id")
    .lean() as Promise<{ _id: mongoose.Types.ObjectId } | null>;
}

export async function findPublishedReadPost(args: {
  authorId: mongoose.Types.ObjectId;
  slug: string;
  postId?: string;
}): Promise<{ _id: mongoose.Types.ObjectId } | null> {
  return BlogPostModel.findOne({
    ...(args.postId ? { _id: new mongoose.Types.ObjectId(args.postId) } : {}),
    authorId: args.authorId,
    slug: args.slug,
    status: "published",
    ...NOT_DELETED_FILTER,
  })
    .select("_id")
    .lean() as Promise<{ _id: mongoose.Types.ObjectId } | null>;
}

export async function createReadViewSession(args: {
  redis: RedisClient;
  readerId: mongoose.Types.ObjectId;
  postId: unknown;
}): Promise<string> {
  const sessionId = randomUUID();
  const key = redisKeys.readStreak.viewSession(sessionId);
  await args.redis.hSet(key, {
    userId: String(args.readerId),
    postId: String(args.postId),
    startTime: String(Date.now()),
    used: "0",
  });
  await args.redis.expire(key, READ_VIEW_SESSION_TTL_SEC);
  return sessionId;
}

export function respondReadAlreadyProcessed(
  res: Response,
  dayBucket: string,
): void {
  res.status(200).json({
    success: true,
    counted: true,
    alreadyProcessed: true,
    dayBucket,
  });
}

export async function handleMissingReadViewSession(args: {
  res: Response;
  redis: RedisClient;
  ackKey: string;
  readerId: mongoose.Types.ObjectId;
}): Promise<void> {
  const ackHit = await args.redis.get(args.ackKey);
  const now = new Date();
  const dayBucket = streakUtcDayBucket(now);
  if (ackHit) {
    respondReadAlreadyProcessed(args.res, dayBucket);
    return;
  }
  const mongoHit = await BlogReadDayModel.exists({
    readerId: args.readerId,
    dayBucket,
  });
  if (mongoHit) {
    respondReadAlreadyProcessed(args.res, dayBucket);
    return;
  }
  args.res.status(400).json({ success: false, reason: "invalid_session" });
}

export function validateReadViewSessionOwnership(args: {
  res: Response;
  sessionUserId: string;
  readerId: mongoose.Types.ObjectId;
}): boolean {
  if (args.sessionUserId === String(args.readerId)) return true;
  args.res.status(403).json({ success: false, message: "Session mismatch" });
  return false;
}

export function validateReadViewDwell(
  res: Response,
  startTimeRaw: string | undefined,
): boolean {
  const startMs = Number.parseInt(startTimeRaw ?? "", 10);
  const elapsed = Date.now() - startMs;
  if (Number.isFinite(elapsed) && elapsed >= MIN_READ_COMMIT_DWELL_MS) {
    return true;
  }
  res.status(400).json({
    success: false,
    reason: "dwell_too_short",
    minDwellMs: MIN_READ_COMMIT_DWELL_MS,
  });
  return false;
}

export async function upsertReadDayAndBumpLongest(
  readerId: mongoose.Types.ObjectId,
  dayBucket: string,
  now: Date,
): Promise<void> {
  await BlogReadDayModel.updateOne(
    { readerId, dayBucket },
    { $set: { updatedAt: now } },
    { upsert: true },
  );
  await bumpReadStreakLongestFromMongo(readerId, now).catch((e) =>
    console.error("[read-streak] bump longest", e),
  );
}

export async function commitReadViewInRedis(args: {
  redis: RedisClient;
  sessionKey: string;
  streakKey: string;
  zKey: string;
  ackKey: string;
  today: string;
  yesterday: string;
  now: Date;
  readerId: mongoose.Types.ObjectId;
  postId: string;
}) {
  return evalReadViewCommitMerged(
    args.redis,
    [args.sessionKey, args.streakKey, args.zKey, args.ackKey],
    {
      today: args.today,
      yesterday: args.yesterday,
      zsetScoreMs: readDayZsetScoreMs(args.today),
      trimMinScoreStr: String(readDaysTrimMinRetainMsUtc(args.now)),
      lastUpdatedMs: String(args.now.getTime()),
      userId: String(args.readerId),
      postId: args.postId,
      ackTtlSeconds: READ_VIEW_ACK_TTL_SEC,
    },
  );
}

export async function handleInvalidReadViewCommit(args: {
  res: Response;
  readerId: mongoose.Types.ObjectId;
  dayBucket: string;
}): Promise<void> {
  const mongoHit = await BlogReadDayModel.exists({
    readerId: args.readerId,
    dayBucket: args.dayBucket,
  });
  if (mongoHit) {
    respondReadAlreadyProcessed(args.res, args.dayBucket);
    return;
  }
  args.res.status(400).json({ success: false, reason: "invalid_session" });
}
