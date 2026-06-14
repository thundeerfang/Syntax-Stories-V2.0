import { resolvePublicApiBase } from "@/lib/api/publicApiBase";
export type StorageHealthResult = {
  blocked: boolean;
  reason: "mongo_quota" | "disk_full" | "manual" | null;
  since: string | null;
};
export async function fetchStorageHealth(
  apiBase?: string,
  timeoutMs = 8000,
): Promise<StorageHealthResult> {
  const base = (apiBase ?? resolvePublicApiBase()).replace(/\/$/, "");
  if (!base) return { blocked: false, reason: null, since: null };
  const controller = new AbortController();
  const t = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(`${base}/api/health/storage`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
    const data = (await r.json().catch(() => null)) as {
      storage?: {
        blocked?: boolean;
        reason?: StorageHealthResult["reason"];
        since?: string | null;
      };
    } | null;
    const storage = data?.storage;
    return {
      blocked: storage?.blocked === true,
      reason:
        storage?.reason === "mongo_quota" ||
        storage?.reason === "disk_full" ||
        storage?.reason === "manual"
          ? storage.reason
          : storage?.blocked
            ? "manual"
            : null,
      since: typeof storage?.since === "string" ? storage.since : null,
    };
  } catch {
    return { blocked: false, reason: null, since: null };
  } finally {
    globalThis.clearTimeout(t);
  }
}
