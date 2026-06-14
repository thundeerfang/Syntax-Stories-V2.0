import { randomUUID } from "node:crypto";
import { getRedis } from "../../config/redis.js";
import { SessionModel } from "../../models/Session.js";
import { redisKeys } from "../../shared/redis/keys.js";
import {
  ADMIN_IDLE_STEP_UP_SEC,
  ADMIN_STEP_UP_GRACE_SEC,
} from "./stepUp.config.js";
import { hasValidStepUp, markStepUpVerified } from "./stepUp.service.js";
export const ADMIN_SERVER_BOOT_ID = randomUUID();
export type AdminSessionIdleStatus = {
  lastActiveAt: string;
  idleExpiresAt: string;
  stepUpVerified: boolean;
  stepUpExpiresAt: string | null;
  confirmationRequired: boolean;
  graceExpiresAt: string | null;
  serverBootId: string;
  idleLimitSeconds: number;
  graceLimitSeconds: number;
};
function iso(d: Date | null | undefined): string | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}
async function readBootAck(sessionId: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get(redisKeys.iam.adminBootAck(sessionId));
}
async function writeBootAck(sessionId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.setEx(
    redisKeys.iam.adminBootAck(sessionId),
    ADMIN_IDLE_STEP_UP_SEC * 2,
    ADMIN_SERVER_BOOT_ID,
  );
}
async function ensureGraceDeadline(sessionId: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis)
    return new Date(Date.now() + ADMIN_STEP_UP_GRACE_SEC * 1000).toISOString();
  const key = redisKeys.iam.adminStepUpGrace(sessionId);
  const existing = await redis.get(key);
  if (existing) {
    const ms = Number.parseInt(existing, 10);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  const expiresMs = Date.now() + ADMIN_STEP_UP_GRACE_SEC * 1000;
  await redis.setEx(key, ADMIN_STEP_UP_GRACE_SEC, String(expiresMs));
  return new Date(expiresMs).toISOString();
}
async function clearGraceDeadline(sessionId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(redisKeys.iam.adminStepUpGrace(sessionId));
}
async function readStepUpExpiresAt(sessionId: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const ttl = await redis.ttl(redisKeys.iam.stepUp(sessionId));
  if (ttl <= 0) return null;
  return new Date(Date.now() + ttl * 1000).toISOString();
}
export async function touchAdminSessionActivity(
  sessionId: string,
): Promise<Date | null> {
  const session = await SessionModel.findById(sessionId);
  if (!session || session.revoked) return null;
  session.lastActiveAt = new Date();
  await session.save();
  return session.lastActiveAt;
}
export async function getAdminSessionIdleStatus(
  sessionId: string,
  userId: string,
): Promise<AdminSessionIdleStatus | null> {
  const session = await SessionModel.findById(sessionId)
    .select("lastActiveAt revoked")
    .lean();
  if (!session || session.revoked) return null;
  const lastActiveAt = session.lastActiveAt ?? new Date();
  const idleExpiresAt = new Date(
    lastActiveAt.getTime() + ADMIN_IDLE_STEP_UP_SEC * 1000,
  );
  const now = Date.now();
  const [stepUpVerified, bootAck, stepUpExpiresAt] = await Promise.all([
    hasValidStepUp(sessionId, userId),
    readBootAck(sessionId),
    readStepUpExpiresAt(sessionId),
  ]);
  const backendReset = !bootAck || bootAck !== ADMIN_SERVER_BOOT_ID;
  const idleExpired = now >= idleExpiresAt.getTime();
  const confirmationRequired = !stepUpVerified || idleExpired || backendReset;
  let graceExpiresAt: string | null = null;
  if (confirmationRequired) {
    graceExpiresAt = await ensureGraceDeadline(sessionId);
  } else {
    await clearGraceDeadline(sessionId);
  }
  return {
    lastActiveAt: iso(lastActiveAt) ?? new Date().toISOString(),
    idleExpiresAt: idleExpiresAt.toISOString(),
    stepUpVerified,
    stepUpExpiresAt,
    confirmationRequired,
    graceExpiresAt,
    serverBootId: ADMIN_SERVER_BOOT_ID,
    idleLimitSeconds: ADMIN_IDLE_STEP_UP_SEC,
    graceLimitSeconds: ADMIN_STEP_UP_GRACE_SEC,
  };
}
export async function completeAdminStepUp(
  sessionId: string,
  userId: string,
): Promise<void> {
  await markStepUpVerified(sessionId, userId);
  await touchAdminSessionActivity(sessionId);
  await writeBootAck(sessionId);
  await clearGraceDeadline(sessionId);
}
