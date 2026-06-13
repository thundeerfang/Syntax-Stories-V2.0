import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';
import { SessionModel } from '../../models/Session.js';
import type { SessionTier } from './sessionTier.config.js';
import { IMPERSONATION_TTL_SEC } from '../../variable/constants.js';

export type ImpersonationState = {
  impersonatorId: string;
  targetUserId: string;
  targetUsername: string | null;
  targetEmail: string | null;
  startedAt: number;
  expiresAt: number;
};

export async function startImpersonation(
  sessionId: string,
  impersonatorId: string,
  target: { userId: string; username: string | null; email: string | null }
): Promise<ImpersonationState> {
  const startedAt = Date.now();
  const expiresAt = startedAt + IMPERSONATION_TTL_SEC * 1000;
  const state: ImpersonationState = {
    impersonatorId,
    targetUserId: target.userId,
    targetUsername: target.username,
    targetEmail: target.email,
    startedAt,
    expiresAt,
  };

  const redis = getRedis();
  if (redis) {
    await redis.setEx(
      redisKeys.iam.impersonation(sessionId),
      IMPERSONATION_TTL_SEC,
      JSON.stringify(state)
    );
  }

  await SessionModel.updateOne(
    { _id: sessionId },
    {
      $set: {
        sessionTier: 'impersonation' satisfies SessionTier,
        impersonatorId,
        impersonatedUserId: target.userId,
      },
    }
  );

  return state;
}

export async function getImpersonation(sessionId: string): Promise<ImpersonationState | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(redisKeys.iam.impersonation(sessionId));
    if (!raw) return null;
    const state = JSON.parse(raw) as ImpersonationState;
    if (state.expiresAt < Date.now()) {
      await endImpersonation(sessionId);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export async function endImpersonation(sessionId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(redisKeys.iam.impersonation(sessionId));
    } catch {
      /* ignore */
    }
  }
  const { getActorMaxRoleLevel } = await import('../rbac/services/rbac.service.js');
  const session = await SessionModel.findById(sessionId).select('userId').lean();
  let tier: SessionTier = 'standard';
  if (session?.userId) {
    const level = await getActorMaxRoleLevel(String(session.userId));
    const { resolveSessionTier } = await import('./sessionTier.config.js');
    tier = resolveSessionTier({ roleLevel: level });
  }
  await SessionModel.updateOne(
    { _id: sessionId },
    {
      $set: { sessionTier: tier },
      $unset: { impersonatorId: 1, impersonatedUserId: 1 },
    }
  );
}
