import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { getRedis } from "../../config/redis.js";
import {
  sendAuthEmail,
  isAuthEmailConfigured,
} from "../../infrastructure/mail/sendAuthEmail.js";
import { buildStorageGuardEmail } from "../../infrastructure/mail/emailTemplates.js";
import { redisKeys } from "../../shared/redis/keys.js";
import { getDefaultUploadStorage } from "../storage/localDiskUploadStorage.js";
export type StorageBlockReason = "mongo_quota" | "disk_full" | "manual";
export type StorageStatus = {
  blocked: boolean;
  reason: StorageBlockReason | null;
  since: string | null;
};
const ALERT_THROTTLE_SEC = 3600;
const STORAGE_FULL_MESSAGE =
  "Syntax Stories cannot accept new data right now. Please try again later.";
let memoryReason: StorageBlockReason | null = null;
let memorySince: string | null = null;
let probeTimer: ReturnType<typeof setInterval> | null = null;
function uploadsRoot(): string {
  return env.UPLOADS_ROOT || getDefaultUploadStorage().dirs.root;
}
function pathOnly(url: string): string {
  const u = url.split("?")[0] ?? "";
  return u.endsWith("/") && u.length > 1 ? u.slice(0, -1) : u;
}
export function storageFullPublicMessage(): string {
  return STORAGE_FULL_MESSAGE;
}
export function isMongoStorageError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    name?: string;
    code?: number;
    message?: string;
  };
  const msg = (e.message ?? "").toLowerCase();
  if (
    msg.includes("space quota") ||
    msg.includes("out of space") ||
    msg.includes("quotaexceeded") ||
    msg.includes("disk quota") ||
    msg.includes("insufficient storage")
  ) {
    return true;
  }
  if (e.code === 14031) return true;
  if (e.name === "MongoServerError" && /space|quota|full/i.test(msg))
    return true;
  return false;
}
export function isEnospcError(err: unknown): boolean {
  return !!(
    err &&
    typeof err === "object" &&
    (err as NodeJS.ErrnoException).code === "ENOSPC"
  );
}
async function readRedisState(): Promise<StorageStatus | null> {
  const redis = getRedis();
  if (!redis) return null;
  const [blocked, reason, since] = await Promise.all([
    redis.get(redisKeys.platform.storageBlocked),
    redis.get(redisKeys.platform.storageReason),
    redis.get(redisKeys.platform.storageSince),
  ]);
  if (blocked !== "1") return { blocked: false, reason: null, since: null };
  const r = reason as StorageBlockReason | null;
  return {
    blocked: true,
    reason:
      r === "mongo_quota" || r === "disk_full" || r === "manual" ? r : "manual",
    since: since ?? null,
  };
}
async function writeRedisState(
  reason: StorageBlockReason,
  since: string,
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const chain = redis.multi();
    chain.set(redisKeys.platform.storageBlocked, "1");
    chain.set(redisKeys.platform.storageReason, reason);
    chain.set(redisKeys.platform.storageSince, since);
    await chain.exec();
  }
  memoryReason = reason;
  memorySince = since;
}
async function clearRedisState(): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del([
      redisKeys.platform.storageBlocked,
      redisKeys.platform.storageReason,
      redisKeys.platform.storageSince,
    ]);
  }
  memoryReason = null;
  memorySince = null;
}
function memoryState(): StorageStatus {
  if (!memoryReason) return { blocked: false, reason: null, since: null };
  return { blocked: true, reason: memoryReason, since: memorySince };
}
export async function getStorageStatus(): Promise<StorageStatus> {
  if (env.STORAGE_FULL_MODE === "force_off") {
    return { blocked: false, reason: null, since: null };
  }
  if (env.STORAGE_FULL_MODE === "force_on") {
    return {
      blocked: true,
      reason: "manual",
      since: memorySince ?? new Date().toISOString(),
    };
  }
  const redisState = await readRedisState();
  if (redisState) return redisState;
  return memoryState();
}
async function sendStorageAlert(
  reason: StorageBlockReason,
  since: string,
): Promise<void> {
  if (!isAuthEmailConfigured()) {
    console.warn(
      "[storageGuard] Email not configured — skipping alert for",
      reason,
    );
    return;
  }
  const redis = getRedis();
  if (redis) {
    const alerted = await redis.get(redisKeys.platform.storageAlerted);
    if (alerted === "1") return;
    await redis.set(redisKeys.platform.storageAlerted, "1", {
      EX: ALERT_THROTTLE_SEC,
    });
  }
  const label =
    reason === "mongo_quota"
      ? "MongoDB Atlas storage quota"
      : reason === "disk_full"
        ? "Uploads disk full"
        : "Manual storage block";
  try {
    await sendAuthEmail({
      to: env.STORAGE_ALERT_EMAIL,
      subject: `[Syntax Stories] Storage full — ${label}`,
      html: buildStorageGuardEmail({
        label,
        since,
        recovery:
          "Public writes are blocked. Admin panel remains available. To recover: free Mongo/disk space, then set STORAGE_FULL_MODE=force_off and restart, or wait for disk probe auto-recovery.",
      }),
    });
  } catch (e) {
    console.error("[storageGuard] Alert email failed:", e);
  }
}
export async function activateStorageBlock(
  reason: StorageBlockReason,
): Promise<void> {
  if (env.STORAGE_FULL_MODE === "force_off") return;
  const current = await getStorageStatus();
  if (current.blocked && current.reason === reason) return;
  const since = new Date().toISOString();
  await writeRedisState(reason, since);
  console.error(`[storageGuard] Activated: ${reason} at ${since}`);
  void sendStorageAlert(reason, since);
}
export async function deactivateStorageBlock(): Promise<void> {
  await clearRedisState();
  const redis = getRedis();
  if (redis) await redis.del(redisKeys.platform.storageAlerted);
}
export async function maybeActivateFromError(err: unknown): Promise<boolean> {
  if (isMongoStorageError(err)) {
    await activateStorageBlock("mongo_quota");
    return true;
  }
  if (isEnospcError(err)) {
    await activateStorageBlock("disk_full");
    return true;
  }
  return false;
}
async function diskUsagePercent(): Promise<number | null> {
  const root = uploadsRoot();
  try {
    const stat = await fs.statfs(root);
    const total = Number(stat.blocks) * Number(stat.bsize);
    const free = Number(stat.bfree) * Number(stat.bsize);
    if (!total) return null;
    const used = total - free;
    return Math.round((used / total) * 1000) / 10;
  } catch {
    return null;
  }
}
export async function runStorageProbe(): Promise<void> {
  if (env.STORAGE_FULL_MODE === "force_off") {
    await deactivateStorageBlock();
    return;
  }
  if (env.STORAGE_FULL_MODE === "force_on") {
    await activateStorageBlock("manual");
    return;
  }
  const pct = await diskUsagePercent();
  if (pct == null) return;
  const status = await getStorageStatus();
  if (pct >= env.UPLOADS_DISK_BLOCK_PCT) {
    await activateStorageBlock("disk_full");
    return;
  }
  if (pct >= env.UPLOADS_DISK_WARN_PCT && pct < env.UPLOADS_DISK_BLOCK_PCT) {
    console.warn(
      `[storageGuard] Uploads disk at ${pct}% (warn threshold ${env.UPLOADS_DISK_WARN_PCT}%)`,
    );
    return;
  }
  if (
    status.blocked &&
    status.reason === "disk_full" &&
    pct < env.UPLOADS_DISK_WARN_PCT
  ) {
    await deactivateStorageBlock();
    console.log(
      `[storageGuard] Disk recovered (${pct}%) — public writes re-enabled`,
    );
  }
}
export function startStorageGuardProbe(): void {
  if (probeTimer) return;
  void runStorageProbe();
  probeTimer = setInterval(
    () => void runStorageProbe(),
    env.STORAGE_PROBE_INTERVAL_MS,
  );
  probeTimer.unref?.();
}
export function isStorageGateExempt(
  method: string,
  originalUrl: string,
): boolean {
  const p = pathOnly(originalUrl);
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return true;
  if (p.startsWith("/api/health")) return true;
  if (p === "/api/ping") return true;
  if (p.startsWith("/api/webhooks/")) return true;
  if (p === "/webhooks/stripe") return true;
  if (p.startsWith("/api/internal/")) return true;
  if (p.startsWith("/api/v1/admin/")) return true;
  if (p.startsWith("/api/upload")) return true;
  if (p.startsWith("/api/feedback")) return true;
  if (p.startsWith("/uploads/")) return true;
  return false;
}
export function resolveUploadsRootForHealth(): string {
  return path.resolve(uploadsRoot());
}
