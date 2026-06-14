import { getRedis } from "../../config/redis.js";
import { redisKeys } from "../../shared/redis/keys.js";
import { clearL1PermissionCache } from "../rbac/services/adminPermissionL1Cache.js";
type InvalidatePayload = {
  userId: string;
};
let subscriberStarted = false;
export async function startPermissionInvalidationSubscriber(): Promise<void> {
  if (subscriberStarted) return;
  const redis = getRedis();
  if (!redis) return;
  const sub = redis.duplicate();
  await sub.connect();
  const channel = redisKeys.iam.permissionInvalidateChannel;
  await sub.subscribe(channel, (message) => {
    try {
      const payload = JSON.parse(message) as InvalidatePayload;
      if (payload.userId) {
        clearL1PermissionCache(payload.userId);
      }
    } catch {}
  });
  subscriberStarted = true;
  console.log("[IAM] Permission invalidation subscriber active");
}
export async function publishPermissionInvalidation(
  userId: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.publish(
      redisKeys.iam.permissionInvalidateChannel,
      JSON.stringify({ userId }),
    );
  } catch {}
}
