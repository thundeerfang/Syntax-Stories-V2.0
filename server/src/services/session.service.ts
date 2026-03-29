import crypto from 'node:crypto';
import type { Request } from 'express';
import { SessionModel } from '../models/Session';
import { signAccessToken } from '../config/jwt';

/** Session duration and sliding window (matches prior auth.controller / authLogin behavior). */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getClientMeta(req: Request): { ip: string; userAgent: string } {
  const ip =
    req.ip ??
    (req.connection as { remoteAddress?: string })?.remoteAddress ??
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
    'unknown';
  const userAgent = req.get('User-Agent') ?? '';
  return { ip, userAgent };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

function parseUserAgent(ua: string): string {
  if (!ua) return 'Unknown device';
  const match = ua.match(/\((.*?)\)/);
  const os = match ? match[1] : ua.substring(0, 50);
  const mobile = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';
  return `${mobile} - ${os}`;
}

export async function createSession(
  userId: string,
  req: Request,
  refreshToken: string
): Promise<InstanceType<typeof SessionModel>> {
  const { ip, userAgent } = getClientMeta(req);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await SessionModel.create({
    userId,
    refreshTokenHash: hashToken(refreshToken),
    deviceName: parseUserAgent(userAgent),
    userAgent,
    ip,
    expiresAt,
  });
  return session;
}

/** Used by OAuth callbacks and any flow that needs JWT + refresh + persisted session. */
export async function createSessionAndTokens(
  userId: string,
  req: Request
): Promise<{ accessToken: string; refreshToken: string; session: InstanceType<typeof SessionModel> }> {
  const refreshToken = generateRefreshToken();
  const session = await createSession(userId, req, refreshToken);
  const accessToken = signAccessToken({ _id: userId, sessionId: String(session._id) });
  return { accessToken, refreshToken, session };
}
