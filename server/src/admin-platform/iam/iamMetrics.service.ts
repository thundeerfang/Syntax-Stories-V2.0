import { getRedis } from "../../config/redis.js";
import { redisKeys } from "../../shared/redis/keys.js";
export const IAM_METRIC_KEYS = [
  "refresh_success",
  "refresh_failure",
  "refresh_token_reuse",
  "permission_denied",
  "step_up_required",
  "step_up_verified",
  "invite_otp_sent",
  "staff_login_success",
  "staff_login_failure",
  "device_binding_denied",
  "device_binding_new_device",
  "impersonation_started",
  "impersonation_ended",
  "risk_blocked",
  "elevation_granted",
] as const;
export type IamMetricKey = (typeof IAM_METRIC_KEYS)[number];
export async function incrementIamMetric(
  key: IamMetricKey,
  by = 1,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.hIncrBy(redisKeys.iam.metrics, key, by);
  } catch {}
}
export async function getIamMetrics(): Promise<Record<string, number>> {
  const redis = getRedis();
  const out: Record<string, number> = {};
  for (const k of IAM_METRIC_KEYS) {
    out[k] = 0;
  }
  if (!redis) return out;
  try {
    const raw = await redis.hGetAll(redisKeys.iam.metrics);
    for (const [k, v] of Object.entries(raw)) {
      out[k] = Number.parseInt(v, 10) || 0;
    }
  } catch {}
  return out;
}
