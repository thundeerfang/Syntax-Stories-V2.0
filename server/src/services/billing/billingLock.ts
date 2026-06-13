import { randomUUID } from 'crypto';
import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';
import {
  BILLING_LOCK_HEARTBEAT_MS,
  BILLING_LOCK_TTL_SEC,
} from '../../variable/constants.js';

const releaseScript = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

const extendScript = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("expire", KEYS[1], ARGV[2])
else
  return 0
end
`;

/**
 * Serialize writes per Stripe subscription id using Redis token lock (§2.4.1).
 * Without Redis, runs unguarded (dev / degraded single-instance).
 */
export async function withBillingLock<T>(
  stripeSubscriptionId: string,
  work: () => Promise<T>
): Promise<T> {
  const redis = getRedis();
  if (!redis) {
    return work();
  }

  const key = redisKeys.billing.billingLock(stripeSubscriptionId);
  const token = randomUUID();
  const ok = await redis.set(key, token, { NX: true, EX: BILLING_LOCK_TTL_SEC });
  if (ok !== 'OK') {
    await sleep(50);
    return withBillingLock(stripeSubscriptionId, work);
  }

  let hb: ReturnType<typeof setInterval> | undefined;
  try {
    hb = setInterval(() => {
      void (async () => {
        try {
          await redis.eval(extendScript, { keys: [key], arguments: [token, String(BILLING_LOCK_TTL_SEC)] });
        } catch {
          // ignore extend errors
        }
      })();
    }, BILLING_LOCK_HEARTBEAT_MS);

    return await work();
  } finally {
    if (hb) clearInterval(hb);
    try {
      await redis.eval(releaseScript, { keys: [key], arguments: [token] });
    } catch {
      // best-effort release
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
