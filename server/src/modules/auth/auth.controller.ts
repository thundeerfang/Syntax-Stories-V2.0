import { Request, Response } from 'express';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { UserModel, normalizeProfileImg } from '../../models/User';
import { SessionModel } from '../../models/Session';
import { SecurityEventModel } from '../../models/SecurityEvent';
import { authConfig } from '../../config/auth.config';
import { signAccessToken } from '../../config/jwt';
import { getRedis } from '../../config/redis';
import type { AuthUser } from '../../middlewares/auth';
import { consumeAuthChallenge } from '../../utils/authChallenge';
import { writeAuditLog } from '../../shared/audit/auditLog';
import { AuditAction, type AuditActionName } from '../../shared/audit/events';
import { redisKeys } from '../../shared/redis/keys';
import { logSecurityEvent } from './securityEventLog';
import { createSession, generateRefreshToken, SESSION_DURATION_MS } from '../../services/session.service';

const INTENT_TTL_SECONDS = 5 * 60;
const TWO_FA_SETUP_TTL_SECONDS = 10 * 60;

const ALLOWED_INTENT_ACTIONS = ['delete_account'] as const;
type IntentAction = (typeof ALLOWED_INTENT_ACTIONS)[number];

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

async function storeIntent(
  userId: string,
  action: IntentAction
): Promise<{ token: string; expiresIn: number }> {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Redis required for intent tokens');
  }
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const key = redisKeys.auth.intent(tokenHash);
  const payload = JSON.stringify({ userId, action });
  await redis.setEx(key, INTENT_TTL_SECONDS, payload);
  return { token: rawToken, expiresIn: INTENT_TTL_SECONDS };
}

async function getTwoFactorSetupSecret(userId: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const key = redisKeys.auth.twoFactorSetup(userId);
  return (await redis.get(key)) ?? null;
}

async function storeTwoFactorSetupSecret(userId: string, secret: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Redis required for 2FA setup');
  }
  const key = redisKeys.auth.twoFactorSetup(userId);
  await redis.setEx(key, TWO_FA_SETUP_TTL_SECONDS, secret);
}

export async function verifyTwoFactorLogin(req: Request, res: Response): Promise<void> {
  try {
    const { challengeToken, token } = req.body as { challengeToken?: string; token?: string };
    if (!challengeToken || !token) {
      res.status(400).json({ success: false, message: 'challengeToken and token are required' });
      return;
    }

    const challenge = await consumeAuthChallenge(challengeToken);
    if (!challenge?.userId) {
      res.status(400).json({ success: false, message: 'Invalid or expired 2FA challenge' });
      return;
    }

    const dbUser = await UserModel.findById(challenge.userId).select('+twoFactorSecret');
    if (!dbUser || !dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
      res.status(400).json({ success: false, message: 'Two-factor authentication is not enabled' });
      return;
    }

    const isValid = speakeasy.totp.verify({
      secret: dbUser.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!isValid) {
      res.status(401).json({ success: false, message: 'Invalid 2FA code' });
      return;
    }

    const refreshToken = generateRefreshToken();
    const session = await createSession(String(dbUser._id), req, refreshToken);
    const accessToken = signAccessToken({ _id: String(dbUser._id), sessionId: String(session._id) });
    void writeAuditLog(req, AuditAction.SESSION_CREATED, {
      actorId: String(dbUser._id),
      metadata: {
        sessionId: String(session._id),
        deviceName: session.deviceName,
        source: '2fa',
        expiresAt: session.expiresAt?.toISOString?.(),
      },
    });
    void writeAuditLog(req, AuditAction.USER_SIGNIN, { actorId: String(dbUser._id), metadata: { source: '2fa' } });
    res.status(200).json({
      success: true,
      message: 'Signed in successfully 🚀',
      accessToken,
      refreshToken,
      expiresIn: authConfig.ACCESS_TOKEN_EXPIRY,
      sessionId: session._id,
      user: {
        _id: dbUser._id,
        fullName: dbUser.fullName,
        username: dbUser.username,
        email: dbUser.email,
        profileImg: normalizeProfileImg(dbUser.profileImg),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal Server Error 💀' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const refreshTokenRaw = (req.body as { refreshToken?: string }).refreshToken;
    if (!refreshTokenRaw) {
      res.status(400).json({ message: 'Refresh token required', success: false });
      return;
    }
    const refreshTokenHash = hashToken(refreshTokenRaw);
    const session = await SessionModel.findOne({
      refreshTokenHash,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });
    if (!session) {
      res.status(401).json({
        message: 'Session invalid or expired. Please log in again.',
        success: false,
      });
      return;
    }
    const user = await UserModel.findById(session.userId).select('isActive');
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Account disabled or not found', success: false });
      return;
    }
    // Sliding expiry: extend session on each refresh so active users stay logged in
    session.lastActiveAt = new Date();
    session.expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await session.save();
    const accessToken = signAccessToken({ _id: String(user._id), sessionId: String(session._id) });
    res.status(200).json({
      message: 'Token refreshed 🚀',
      success: true,
      accessToken,
      expiresIn: authConfig.ACCESS_TOKEN_EXPIRY,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    const sessionId = (req.body as { sessionId?: string }).sessionId ?? user?.sessionId;
    if (sessionId && user?._id) {
      const session = await SessionModel.findOne({ _id: sessionId, userId: user._id });
      if (session) {
        session.revoked = true;
        await session.save();
        await logSecurityEvent(user._id, 'session_revoked', req, { sessionId });
        void writeAuditLog(req, AuditAction.USER_SIGNOUT, { actorId: String(user._id), metadata: { sessionId } });
        void writeAuditLog(req, AuditAction.SESSION_REVOKED, { actorId: String(user._id), metadata: { sessionId } });
      }
    } else {
      const refreshToken = (req.body as { refreshToken?: string }).refreshToken;
      const refreshTokenHash = refreshToken ? hashToken(refreshToken) : null;
      if (refreshTokenHash && user?._id) {
        const session = await SessionModel.findOne({ refreshTokenHash, userId: user._id });
        if (session) {
          session.revoked = true;
          await session.save();
          await logSecurityEvent(user._id, 'session_revoked', req, { sessionId: session._id });
          void writeAuditLog(req, AuditAction.USER_SIGNOUT, { actorId: String(user._id), metadata: { sessionId: session._id } });
          void writeAuditLog(req, AuditAction.SESSION_REVOKED, { actorId: String(user._id), metadata: { sessionId: session._id } });
        }
      }
    }
    res.status(200).json({ message: 'Logged out successfully 👋', success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

/** Revoke session by refresh token only (no JWT). Use when token expired and client clears state. */
export async function revokeSessionByRefreshToken(req: Request, res: Response): Promise<void> {
  try {
    const refreshTokenRaw = (req.body as { refreshToken?: string }).refreshToken;
    if (!refreshTokenRaw || typeof refreshTokenRaw !== 'string') {
      res.status(400).json({ message: 'refreshToken required', success: false });
      return;
    }
    const refreshTokenHash = hashToken(refreshTokenRaw);
    const session = await SessionModel.findOne({ refreshTokenHash });
    if (session) {
      session.revoked = true;
      await session.save();
      await logSecurityEvent(String(session.userId), 'session_revoked', req, { sessionId: session._id });
      void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
        actorId: String(session.userId),
        metadata: { sessionId: String(session._id) },
      });
    }
    res.status(200).json({ message: 'Session revoked', success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function setupTwoFactor(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }

    const dbUser = await UserModel.findById(user._id);
    if (!dbUser) {
      res.status(404).json({ message: 'User not found', success: false });
      return;
    }

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Syntax Stories (${dbUser.email})`,
      issuer: 'Syntax Stories',
    });

    await storeTwoFactorSetupSecret(String(dbUser._id), secret.base32);
    const otpauthUrl = secret.otpauth_url ?? '';
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    res.status(200).json({
      success: true,
      otpauthUrl,
      qrCodeDataUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function enableTwoFactor(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }

    const { token } = req.body as { token?: string };
    if (!token) {
      res.status(400).json({ message: '2FA token is required', success: false });
      return;
    }

    const setupSecret = await getTwoFactorSetupSecret(String(user._id));
    if (!setupSecret) {
      res.status(400).json({ message: '2FA setup not initialized or expired', success: false });
      return;
    }

    const isValid = speakeasy.totp.verify({
      secret: setupSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!isValid) {
      res.status(401).json({ message: 'Invalid 2FA code', success: false });
      return;
    }

    const dbUser = await UserModel.findByIdAndUpdate(
      user._id,
      { twoFactorEnabled: true, twoFactorSecret: setupSecret },
      { new: true }
    );

    const redis = getRedis();
    if (redis) {
      await redis.del(redisKeys.auth.twoFactorSetup(String(user._id)));
    }

    if (!dbUser) {
      res.status(404).json({ message: 'User not found', success: false });
      return;
    }

    await logSecurityEvent(String(user._id), 'twofa_enabled', req, {});
    void writeAuditLog(req, AuditAction.TWOFa_ENABLED, { actorId: String(user._id) });

    res.status(200).json({ success: true, message: 'Two-factor authentication enabled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function disableTwoFactor(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }

    const { token } = req.body as { token?: string };
    if (!token) {
      res.status(400).json({ message: '2FA token is required', success: false });
      return;
    }

    const dbUser = await UserModel.findById(user._id).select('+twoFactorSecret');
    if (!dbUser || !dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
      res.status(400).json({ message: 'Two-factor authentication is not enabled', success: false });
      return;
    }

    const isValid = speakeasy.totp.verify({
      secret: dbUser.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!isValid) {
      res.status(401).json({ message: 'Invalid 2FA code', success: false });
      return;
    }

    dbUser.twoFactorEnabled = false;
    dbUser.twoFactorSecret = undefined;
    await dbUser.save();

    await logSecurityEvent(String(user._id), 'twofa_disabled', req, {});
    void writeAuditLog(req, AuditAction.TWOFa_DISABLED, { actorId: String(user._id) });

    res.status(200).json({ success: true, message: 'Two-factor authentication disabled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function listSessions(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }
    const limitRaw = (req.query.limit as string | undefined) ?? '20';
    const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 20, 50));
    const sessions = await SessionModel.find({
      userId: user._id,
      revoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      sessions: sessions.map((s) => ({
        _id: s._id,
        deviceName: s.deviceName,
        ip: s.ip,
        userAgent: s.userAgent,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }
    const { sessionId } = req.params as { sessionId?: string };
    if (!sessionId) {
      res.status(400).json({ message: 'Session ID required', success: false });
      return;
    }

    const session = await SessionModel.findOne({ _id: sessionId, userId: user._id });
    if (!session || session.revoked) {
      res.status(404).json({ message: 'Session not found', success: false });
      return;
    }

    session.revoked = true;
    await session.save();
    await logSecurityEvent(String(user._id), 'session_revoked', req, { sessionId });
    void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
      actorId: String(user._id),
      metadata: { sessionId },
    });

    res.status(200).json({ success: true, message: 'Session revoked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }

    await SessionModel.updateMany(
      { userId: user._id, revoked: false },
      { $set: { revoked: true } }
    );
    await logSecurityEvent(String(user._id), 'session_revoked', req, { scope: 'all' });
    void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
      actorId: String(user._id),
      metadata: { scope: 'all' },
    });

    res.status(200).json({ success: true, message: 'All sessions revoked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function logoutOthers(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id || !user.sessionId) {
      res.status(400).json({ message: 'Current session information missing', success: false });
      return;
    }

    await SessionModel.updateMany(
      { userId: user._id, _id: { $ne: user.sessionId }, revoked: false },
      { $set: { revoked: true } }
    );
    await logSecurityEvent(String(user._id), 'session_revoked', req, { scope: 'others' });
    void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
      actorId: String(user._id),
      metadata: { scope: 'others' },
    });

    res.status(200).json({ success: true, message: 'Other sessions revoked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function listSecurityEvents(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }
    const limitRaw = (req.query.limit as string | undefined) ?? '20';
    const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 20, 50));

    const events = await SecurityEventModel.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      events: events.map((e) => ({
        _id: e._id,
        type: e.type,
        ip: e.ip,
        userAgent: e.userAgent,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function createIntent(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }

    const { action } = req.body as { action?: string };
    if (!action || !ALLOWED_INTENT_ACTIONS.includes(action as IntentAction)) {
      res.status(400).json({ message: 'Invalid or missing action', success: false });
      return;
    }

    try {
      const { token, expiresIn } = await storeIntent(String(user._id), action as IntentAction);
      await logSecurityEvent(String(user._id), 'session_created', req, {
        intentAction: action,
      });
      res.status(201).json({ success: true, intentToken: token, expiresIn });
    } catch (err) {
      const message =
        (err as Error).message === 'Redis required for intent tokens'
          ? 'Service temporarily unavailable. Try again later.'
          : 'Internal Server Error 💀';
      res.status(503).json({ message, success: false });
    }
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
  }
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }

    await SessionModel.updateMany(
      { userId: user._id, revoked: false },
      { $set: { revoked: true } }
    );

    const updated = await UserModel.findByIdAndUpdate(
      user._id,
      { isActive: false },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ message: 'User not found', success: false });
      return;
    }

    await logSecurityEvent(String(user._id), 'account_locked', req, { reason: 'delete_account' });
    void writeAuditLog(req, AuditAction.ACCOUNT_LOCKED, { actorId: String(user._id), metadata: { reason: 'delete_account' } });
    void writeAuditLog(req, AuditAction.ACCOUNT_DELETED, { actorId: String(user._id), metadata: { reason: 'delete_account' } });

    res.status(200).json({
      success: true,
      message: 'Account deleted (deactivated) successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}
