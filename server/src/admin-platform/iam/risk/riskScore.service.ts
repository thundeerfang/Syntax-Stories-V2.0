import type { Request } from 'express';
import { env } from '../../../config/env.js';
import { SessionModel } from '../../../models/Session.js';
import { getRedis } from '../../../config/redis.js';
import { redisKeys } from '../../../shared/redis/keys.js';
import { isDeviceTrusted } from '../deviceBinding.service.js';
import { getImpersonation } from '../impersonation.service.js';
import { getIamMetrics } from '../iamMetrics.service.js';

export type RiskDecision = 'ALLOW' | 'STEP_UP' | 'BLOCK';

export type RiskAssessment = {
  score: number;
  decision: RiskDecision;
  signals: string[];
};

const STEP_UP_THRESHOLD = 50;
const BLOCK_THRESHOLD = 80;

function clientIp(req: Request): string {
  return (
    req.ip ??
    req.socket?.remoteAddress ??
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
    'unknown'
  );
}

async function recentFailedLogins(): Promise<number> {
  const m = await getIamMetrics();
  return (m.staff_login_failure ?? 0) + (m.refresh_failure ?? 0);
}

/** Score current staff session risk (Phase 6). */
export async function assessStaffSessionRisk(
  req: Request,
  userId: string,
  sessionId?: string
): Promise<RiskAssessment> {
  if (!env.FEATURE_ADMIN_RISK_ENGINE) {
    return { score: 0, decision: 'ALLOW', signals: [] };
  }

  const signals: string[] = [];
  let score = 0;

  const ip = clientIp(req);
  const ua = req.get('User-Agent') ?? '';

  if (sessionId) {
    const session = await SessionModel.findById(sessionId)
      .select('deviceFingerprint sessionTier rotationGeneration createdAt')
      .lean();
    if (session?.deviceFingerprint) {
      const trusted = await isDeviceTrusted(userId, session.deviceFingerprint);
      if (!trusted) {
        score += 20;
        signals.push('new_device');
      }
    }
    if (session?.sessionTier === 'impersonation') {
      score += 25;
      signals.push('impersonation_session');
    }
    if ((session?.rotationGeneration ?? 0) > 10) {
      score += 10;
      signals.push('high_rotation');
    }
    const impersonation = await getImpersonation(sessionId);
    if (impersonation) {
      score += 15;
      signals.push('active_impersonation');
    }
  }

  const failed = await recentFailedLogins();
  if (failed > 5) {
    score += 30;
    signals.push('elevated_auth_failures');
  }

  if (/tor|vpn|proxy/i.test(ua)) {
    score += 15;
    signals.push('anonymized_client_hint');
  }

  if (ip === 'unknown' || !ip) {
    score += 10;
    signals.push('unknown_ip');
  }

  const sensitiveAction = req.method !== 'GET' && req.method !== 'HEAD';
  if (sensitiveAction && score >= 40) {
    score += 10;
    signals.push('sensitive_mutation');
  }

  score = Math.min(100, score);

  let decision: RiskDecision = 'ALLOW';
  if (score >= BLOCK_THRESHOLD) decision = 'BLOCK';
  else if (score >= STEP_UP_THRESHOLD) decision = 'STEP_UP';

  const redis = getRedis();
  if (redis && sessionId) {
    try {
      await redis.setEx(
        redisKeys.iam.sessionRisk(sessionId),
        300,
        JSON.stringify({ score, decision, signals, at: Date.now() })
      );
    } catch {
      /* ignore */
    }
  }

  return { score, decision, signals };
}

export async function getCachedSessionRisk(sessionId: string): Promise<RiskAssessment | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(redisKeys.iam.sessionRisk(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as RiskAssessment;
  } catch {
    return null;
  }
}
