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
import { env } from '../../config/env';
import type { AuthUser } from '../../middlewares/auth';
import { consumeAuthChallenge } from '../../utils/authChallenge';
import { writeAuditLog } from '../../shared/audit/auditLog';
import { AuditAction, type AuditActionName } from '../../shared/audit/events';
import { redisKeys } from '../../shared/redis/keys';
import { logSecurityEvent } from './securityEventLog';
import { createSession, generateRefreshToken, SESSION_DURATION_MS } from '../../services/session.service';

const INTENT_TTL_SECONDS = 5 * 60;
const TWO_FA_SETUP_TTL_SECONDS = 10 * 60;
const QR_LOGIN_TTL_SECONDS = 5 * 60;

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

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const found = await UserModel.findById(user._id).lean();
    if (!found) {
      res.status(404).json({ message: 'User not found', success: false });
      return;
    }
    const f = found as { createdAt?: Date };
    res.status(200).json({
      success: true,
      user: {
        _id: found._id,
        fullName: found.fullName,
        username: found.username,
        email: found.email,
        profileImg: normalizeProfileImg(found.profileImg),
        coverBanner: found.coverBanner,
        bio: found.bio,
        job: found.job,
        portfolioUrl: (found as any).portfolioUrl,
        linkedin: found.linkedin,
        instagram: found.instagram,
        github: found.github,
        youtube: found.youtube,
        stackAndTools: found.stackAndTools,
        workExperiences: found.workExperiences,
        education: found.education,
        certifications: found.certifications,
        projects: found.projects,
        openSourceContributions: found.openSourceContributions,
        mySetup: (found as any).mySetup,
        isGoogleAccount: found.isGoogleAccount,
        isGitAccount: found.isGitAccount,
        isFacebookAccount: found.isFacebookAccount,
        isXAccount: found.isXAccount,
        isAppleAccount: found.isAppleAccount,
        isDiscordAccount: (found as { isDiscordAccount?: boolean }).isDiscordAccount ?? false,
        twoFactorEnabled: found.twoFactorEnabled,
        createdAt: f.createdAt,
      },
    });
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

const UPDATE_PROFILE_KEYS = [
  'fullName', 'username', 'bio', 'profileImg', 'coverBanner', 'job',
  'portfolioUrl', 'linkedin', 'instagram', 'github', 'youtube',
  'stackAndTools', 'workExperiences', 'education', 'certifications', 'projects', 'openSourceContributions', 'mySetup',
] as const;

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const key of UPDATE_PROFILE_KEYS) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'No valid fields to update', success: false });
      return;
    }

    // Load current profile for sections that are being updated (for audit diff)
    type ProfileSections = { education?: unknown[]; workExperiences?: unknown[]; projects?: unknown[]; certifications?: unknown[]; openSourceContributions?: unknown[]; stackAndTools?: string[]; mySetup?: unknown[] };
    const profileSectionKeys = ['education', 'workExperiences', 'projects', 'certifications', 'openSourceContributions', 'stackAndTools', 'mySetup'] as const;
    let currentProfile: ProfileSections | null = null;
    if (profileSectionKeys.some((k) => updates[k] !== undefined)) {
      const doc = await UserModel.findById(user._id).select(profileSectionKeys.join(' ')).lean();
      if (doc) currentProfile = doc as ProfileSections;
    }

    if (typeof updates.username === 'string') {
      const existing = await UserModel.findOne({
        username: updates.username.trim().toLowerCase(),
        _id: { $ne: user._id },
      });
      if (existing) {
        res.status(409).json({ message: 'Username is already taken. Choose another.', success: false });
        return;
      }
      updates.username = (updates.username as string).trim().toLowerCase();
    }

    // Auto-generate workId for work experiences that don't have one
    const workExperiences = updates.workExperiences as Array<{ workId?: string; [k: string]: unknown }> | undefined;
    if (Array.isArray(workExperiences) && workExperiences.length > 0) {
      const current = await UserModel.findById(user._id).select('workExperiences').lean();
      const existingIds = (current?.workExperiences ?? [])
        .map((we: { workId?: string }) => (we.workId ?? '').trim())
        .filter(Boolean)
        .map((id) => parseInt(id, 10))
        .filter((n) => !Number.isNaN(n));
      let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      for (const we of workExperiences) {
        const id = (we.workId ?? '').trim();
        if (!id) {
          we.workId = String(nextNum);
          nextNum += 1;
        } else {
          const n = parseInt(id, 10);
          if (!Number.isNaN(n) && n >= nextNum) nextNum = n + 1;
        }
      }
      updates.workExperiences = workExperiences;
    }

    // Auto-generate eduId / refCode for education entries
    const education = updates.education as Array<{ eduId?: string; refCode?: string; [k: string]: unknown }> | undefined;
    if (Array.isArray(education) && education.length > 0) {
      const current = await UserModel.findById(user._id).select('education').lean();
      const existingIds = (current?.education ?? [])
        .map((ed: { eduId?: string }) => (ed.eduId ?? '').trim())
        .filter(Boolean)
        .map((id) => parseInt(id, 10))
        .filter((n) => !Number.isNaN(n));
      let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      const year = new Date().getFullYear();
      for (const ed of education) {
        const id = (ed.eduId ?? '').trim();
        if (!id) {
          ed.eduId = String(nextNum);
          nextNum += 1;
        } else {
          const n = parseInt(id, 10);
          if (!Number.isNaN(n) && n >= nextNum) nextNum = n + 1;
        }
        // Always refresh refCode so it reflects latest update year
        ed.refCode = `${year}_EDU_DOC`;
      }
      updates.education = education;
    }

    // Auto-generate certId / certValType for certifications
    const certifications = updates.certifications as Array<{ certId?: string; certValType?: string; [k: string]: unknown }> | undefined;
    if (Array.isArray(certifications) && certifications.length > 0) {
      const current = await UserModel.findById(user._id).select('certifications').lean();
      const existingIds = (current?.certifications ?? [])
        .map((c: { certId?: string }) => (c.certId ?? '').trim())
        .filter(Boolean)
        .map((id) => parseInt(id, 10))
        .filter((n) => !Number.isNaN(n));
      let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      const year = new Date().getFullYear();
      const yearSuffix = String(year).slice(-2);
      const baseValType = `A-${yearSuffix}`;

      for (const cert of certifications) {
        const id = (cert.certId ?? '').trim();
        if (!id) {
          cert.certId = String(nextNum);
          nextNum += 1;
        } else {
          const n = parseInt(id, 10);
          if (!Number.isNaN(n) && n >= nextNum) nextNum = n + 1;
        }
        if (!cert.certValType || !String(cert.certValType).trim()) {
          cert.certValType = baseValType;
        }
      }
      updates.certifications = certifications;
    }

    // Set prjLog (last updated year log) for each project
    const projects = updates.projects as Array<{ prjLog?: string; [k: string]: unknown }> | undefined;
    if (Array.isArray(projects) && projects.length > 0) {
      const year = new Date().getFullYear();
      const logValue = `${year}_prd_log`;
      for (const p of projects) {
        p.prjLog = logValue;
      }
      updates.projects = projects;
    }

    const updated = await UserModel.findByIdAndUpdate(user._id, updates, {
      new: true,
      runValidators: true,
      projection: { twoFactorSecret: 0, googleToken: 0, githubToken: 0, facebookToken: 0, xToken: 0, appleToken: 0, discordToken: 0 },
    }).lean();

    if (!updated) {
      res.status(404).json({ message: 'User not found', success: false });
      return;
    }

    // Audit log: diff profile sections and log add/update/remove
    const actorId = String(user._id);
    const updatedProfile = updated as ProfileSections & { _id: unknown };
    if (currentProfile) {
      const log = (action: AuditActionName, targetType: string, metadata: Record<string, unknown>) => {
        void writeAuditLog(req, action, { actorId, targetType, targetId: actorId, metadata });
      };
      // stackAndTools: array of strings
      if (updates.stackAndTools !== undefined) {
        const oldList = (currentProfile.stackAndTools ?? []) as string[];
        const newList = (updatedProfile.stackAndTools ?? []) as string[];
        for (const t of newList) {
          if (!oldList.includes(t)) log(AuditAction.STACK_TOOL_ADDED, 'profile', { tool: t });
        }
        for (const t of oldList) {
          if (!newList.includes(t)) log(AuditAction.STACK_TOOL_REMOVED, 'profile', { tool: t });
        }
      }
      // education: match by eduId
      if (updates.education !== undefined) {
        const oldE = (currentProfile.education ?? []) as Array<{ eduId?: string }>;
        const newE = (updatedProfile.education ?? []) as Array<{ eduId?: string }>;
        const oldIds = new Set(oldE.map((e) => (e.eduId ?? '').trim()).filter(Boolean));
        const newIds = new Set(newE.map((e) => (e.eduId ?? '').trim()).filter(Boolean));
        for (const e of newE) {
          const id = (e.eduId ?? '').trim();
          if (!id) continue;
          if (!oldIds.has(id)) log(AuditAction.EDUCATION_ADDED, 'education', { eduId: id, school: (e as { school?: string }).school });
          else {
            const prev = oldE.find((x) => (x.eduId ?? '').trim() === id);
            if (prev && JSON.stringify(prev) !== JSON.stringify(e)) log(AuditAction.EDUCATION_UPDATED, 'education', { eduId: id });
          }
        }
        for (const id of oldIds) {
          if (!newIds.has(id)) log(AuditAction.EDUCATION_REMOVED, 'education', { eduId: id });
        }
      }
      // workExperiences: match by workId
      if (updates.workExperiences !== undefined) {
        const oldW = (currentProfile.workExperiences ?? []) as Array<{ workId?: string }>;
        const newW = (updatedProfile.workExperiences ?? []) as Array<{ workId?: string }>;
        const oldIds = new Set(oldW.map((w) => (w.workId ?? '').trim()).filter(Boolean));
        const newIds = new Set(newW.map((w) => (w.workId ?? '').trim()).filter(Boolean));
        for (const w of newW) {
          const id = (w.workId ?? '').trim();
          if (!id) continue;
          if (!oldIds.has(id)) log(AuditAction.WORK_ADDED, 'work', { workId: id, company: (w as { company?: string }).company });
          else {
            const prev = oldW.find((x) => (x.workId ?? '').trim() === id);
            if (prev && JSON.stringify(prev) !== JSON.stringify(w)) log(AuditAction.WORK_UPDATED, 'work', { workId: id });
          }
        }
        for (const id of oldIds) {
          if (!newIds.has(id)) log(AuditAction.WORK_REMOVED, 'work', { workId: id });
        }
      }
      // certifications: match by certId
      if (updates.certifications !== undefined) {
        const oldC = (currentProfile.certifications ?? []) as Array<{ certId?: string }>;
        const newC = (updatedProfile.certifications ?? []) as Array<{ certId?: string }>;
        const oldIds = new Set(oldC.map((c) => (c.certId ?? '').trim()).filter(Boolean));
        const newIds = new Set(newC.map((c) => (c.certId ?? '').trim()).filter(Boolean));
        for (const c of newC) {
          const id = (c.certId ?? '').trim();
          if (!id) continue;
          if (!oldIds.has(id)) log(AuditAction.CERTIFICATION_ADDED, 'certification', { certId: id, name: (c as { name?: string }).name });
          else {
            const prev = oldC.find((x) => (x.certId ?? '').trim() === id);
            if (prev && JSON.stringify(prev) !== JSON.stringify(c)) log(AuditAction.CERTIFICATION_UPDATED, 'certification', { certId: id });
          }
        }
        for (const id of oldIds) {
          if (!newIds.has(id)) log(AuditAction.CERTIFICATION_REMOVED, 'certification', { certId: id });
        }
      }
      // projects: by index (no stable id)
      if (updates.projects !== undefined) {
        const oldP = (currentProfile.projects ?? []) as unknown[];
        const newP = (updatedProfile.projects ?? []) as unknown[];
        if (newP.length > oldP.length) {
          for (let i = oldP.length; i < newP.length; i++) {
            const p = newP[i] as { title?: string };
            log(AuditAction.PROJECT_ADDED, 'project', { index: i, title: p?.title });
          }
        }
        if (newP.length < oldP.length) {
          for (let i = newP.length; i < oldP.length; i++) {
            log(AuditAction.PROJECT_REMOVED, 'project', { index: i });
          }
        }
        const minLen = Math.min(oldP.length, newP.length);
        for (let i = 0; i < minLen; i++) {
          if (JSON.stringify(oldP[i]) !== JSON.stringify(newP[i])) {
            log(AuditAction.PROJECT_UPDATED, 'project', { index: i, title: (newP[i] as { title?: string })?.title });
          }
        }
      }
      // openSourceContributions: match by repositoryUrl or index
      if (updates.openSourceContributions !== undefined) {
        const oldO = (currentProfile.openSourceContributions ?? []) as Array<{ repositoryUrl?: string; title?: string }>;
        const newO = (updatedProfile.openSourceContributions ?? []) as Array<{ repositoryUrl?: string; title?: string }>;
        const oldKeys = new Set(oldO.map((o, i) => (o.repositoryUrl ?? '').trim() || `i:${i}`));
        const newKeys = new Set(newO.map((o, i) => (o.repositoryUrl ?? '').trim() || `i:${i}`));
        for (let i = 0; i < newO.length; i++) {
          const o = newO[i];
          const key = (o.repositoryUrl ?? '').trim() || `i:${i}`;
          if (!oldKeys.has(key)) log(AuditAction.OPEN_SOURCE_ADDED, 'open_source', { repositoryUrl: o.repositoryUrl, title: o.title });
          else {
            const prev = oldO.find((x, j) => ((x.repositoryUrl ?? '').trim() || `i:${j}`) === key);
            if (prev && JSON.stringify(prev) !== JSON.stringify(o)) log(AuditAction.OPEN_SOURCE_UPDATED, 'open_source', { repositoryUrl: o.repositoryUrl, title: o.title });
          }
        }
        for (let i = 0; i < oldO.length; i++) {
          const key = (oldO[i].repositoryUrl ?? '').trim() || `i:${i}`;
          if (!newKeys.has(key)) log(AuditAction.OPEN_SOURCE_REMOVED, 'open_source', { repositoryUrl: oldO[i].repositoryUrl, title: oldO[i].title });
        }
      }
      // mySetup: by index
      if (updates.mySetup !== undefined) {
        const oldM = (currentProfile.mySetup ?? []) as Array<{ label?: string; imageUrl?: string }>;
        const newM = (updatedProfile.mySetup ?? []) as Array<{ label?: string; imageUrl?: string }>;
        if (newM.length > oldM.length) {
          for (let i = oldM.length; i < newM.length; i++) {
            const m = newM[i];
            log(AuditAction.MY_SETUP_ADDED, 'my_setup', { label: m?.label, index: i });
          }
        }
        if (newM.length < oldM.length) {
          for (let i = newM.length; i < oldM.length; i++) {
            log(AuditAction.MY_SETUP_REMOVED, 'my_setup', { label: oldM[i]?.label, index: i });
          }
        }
        const minLen = Math.min(oldM.length, newM.length);
        for (let i = 0; i < minLen; i++) {
          if (JSON.stringify(oldM[i]) !== JSON.stringify(newM[i])) {
            log(AuditAction.MY_SETUP_UPDATED, 'my_setup', { label: newM[i]?.label, index: i });
          }
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      void writeAuditLog(req, AuditAction.PROFILE_UPDATED, { actorId, targetType: 'profile', targetId: actorId, metadata: { keys: Object.keys(updates) } });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: updated._id,
        fullName: updated.fullName,
        username: updated.username,
        email: updated.email,
        profileImg: normalizeProfileImg(updated.profileImg),
        coverBanner: updated.coverBanner,
        bio: updated.bio,
        job: updated.job,
        portfolioUrl: (updated as any).portfolioUrl,
        linkedin: updated.linkedin,
        instagram: updated.instagram,
        github: updated.github,
        youtube: updated.youtube,
        stackAndTools: updated.stackAndTools,
        workExperiences: updated.workExperiences,
        education: updated.education,
        certifications: updated.certifications,
        projects: updated.projects,
        openSourceContributions: updated.openSourceContributions,
        mySetup: (updated as any).mySetup,
      },
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      res.status(409).json({ message: 'Username is already taken. Choose another.', success: false });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

/** Parse CV/Resume PDF and return extracted profile data + missing fields. Does not update user. */
export async function parseCv(req: Request, res: Response): Promise<void> {
  try {
    const file = (req as Request & { file?: Express.Multer.File & { buffer?: Buffer } }).file;
    const buffer = file?.buffer ?? (file as unknown as { buffer?: Buffer })?.buffer;
    if (!buffer) {
      res.status(400).json({ success: false, message: 'No PDF file uploaded' });
      return;
    }
    // pdf-parse v1.1.1 works in Node.js (v2 uses pdfjs-dist with browser-only APIs like DOMMatrix)
    const pdfParse = (await import('pdf-parse')).default as (buf: Buffer) => Promise<{ text: string }>;
    const { text } = await pdfParse(buffer);
    const { parseCvFromText } = await import('../../utils/parseCvFromPdf');
    const { extracted, missingFields, incompleteItemHints } = parseCvFromText(text ?? '');
    res.status(200).json({
      success: true,
      extracted,
      missingFields,
      incompleteItemHints: incompleteItemHints ?? {},
    });
  } catch (err) {
    console.error('parseCv error:', err);
    res.status(500).json({
      success: false,
      message: (err as Error).message || 'Failed to parse PDF',
    });
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

const LINK_TTL_SEC = 300; // 5 min

const LINK_PROVIDERS = ['google', 'github', 'facebook', 'x', 'discord'] as const;
type LinkProvider = (typeof LINK_PROVIDERS)[number];

export async function linkRequest(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }
    const provider = (req.body?.provider as string)?.toLowerCase();
    if (!provider || !LINK_PROVIDERS.includes(provider as LinkProvider)) {
      res.status(400).json({
        message: 'Invalid provider. Use: google, github, facebook, x, discord',
        success: false,
      });
      return;
    }
    const redis = getRedis();
    if (!redis) {
      res.status(503).json({ message: 'Account linking is temporarily unavailable', success: false });
      return;
    }
    const linkKey = crypto.randomBytes(16).toString('hex');
    const key = redisKeys.oauth.link(linkKey);
    await redis.setEx(key, LINK_TTL_SEC, String(user._id));
    const base = (env.BACKEND_URL || '').replace(/\/$/, '');
    if (!base) {
      res.status(500).json({ message: 'Server misconfiguration', success: false });
      return;
    }
    res.status(200).json({
      success: true,
      redirectUrl: `${base}/auth/${provider}/link?k=${linkKey}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

const DISCONNECT_PROVIDERS = ['google', 'github', 'facebook', 'x', 'discord'] as const;
type DisconnectProvider = (typeof DISCONNECT_PROVIDERS)[number];

export async function disconnectProvider(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }
    const provider = (req.params.provider as string)?.toLowerCase();
    if (!provider || !DISCONNECT_PROVIDERS.includes(provider as DisconnectProvider)) {
      res.status(400).json({ message: 'Invalid provider. Use: google, github, facebook, x, discord', success: false });
      return;
    }

    const doc = await UserModel.findById(user._id).select('+googleToken +githubToken +facebookToken +xToken +discordToken');
    if (!doc) {
      res.status(404).json({ message: 'User not found', success: false });
      return;
    }

    const unset: Record<string, 1> = {};
    const set: Record<string, boolean> = {};
    if (provider === 'google') {
      unset.googleId = 1;
      unset.googleToken = 1;
      set.isGoogleAccount = false;
    } else if (provider === 'github') {
      unset.gitId = 1;
      unset.githubToken = 1;
      set.isGitAccount = false;
    } else if (provider === 'facebook') {
      unset.facebookId = 1;
      unset.facebookToken = 1;
      set.isFacebookAccount = false;
    } else if (provider === 'x') {
      unset.xId = 1;
      unset.xToken = 1;
      set.isXAccount = false;
    } else if (provider === 'discord') {
      unset.discordId = 1;
      unset.discordToken = 1;
      set.isDiscordAccount = false;
    }

    await UserModel.findByIdAndUpdate(user._id, { $unset: unset, $set: set });
    await SessionModel.updateMany(
      { userId: user._id, revoked: false },
      { $set: { revoked: true } }
    );
    await logSecurityEvent(String(user._id), 'provider_disconnect', req, { provider });
    void writeAuditLog(req, AuditAction.OAUTH_DISCONNECTED, { actorId: String(user._id), metadata: { provider } });

    res.status(200).json({
      success: true,
      message: `Disconnected from ${provider}. You have been logged out everywhere. Your email and account are unchanged.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function initQrLogin(_req: Request, res: Response): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) {
      res.status(503).json({ message: 'Service temporarily unavailable', success: false });
      return;
    }
    const token = crypto.randomBytes(24).toString('hex');
    const key = redisKeys.auth.qrLogin(token);
    await redis.setEx(key, QR_LOGIN_TTL_SECONDS, JSON.stringify({ approved: false }));
    res.status(201).json({ success: true, qrToken: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function approveQrLogin(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }
    const { qrToken } = req.body as { qrToken?: string };
    if (!qrToken) {
      res.status(400).json({ message: 'qrToken is required', success: false });
      return;
    }
    const redis = getRedis();
    if (!redis) {
      res.status(503).json({ message: 'Service temporarily unavailable', success: false });
      return;
    }
    const key = redisKeys.auth.qrLogin(qrToken);
    const existing = await redis.get(key);
    if (!existing) {
      res.status(400).json({ message: 'QR login session not found or expired', success: false });
      return;
    }
    await redis.setEx(
      key,
      QR_LOGIN_TTL_SECONDS,
      JSON.stringify({ approved: true, userId: String(user._id) })
    );
    res.status(200).json({ success: true, message: 'QR login approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

export async function pollQrLogin(req: Request, res: Response): Promise<void> {
  try {
    const { qrToken } = req.body as { qrToken?: string };
    if (!qrToken) {
      res.status(400).json({ message: 'qrToken is required', success: false });
      return;
    }
    const redis = getRedis();
    if (!redis) {
      res.status(503).json({ message: 'Service temporarily unavailable', success: false });
      return;
    }
    const key = redisKeys.auth.qrLogin(qrToken);
    const value = await redis.get(key);
    if (!value) {
      res.status(404).json({ success: false, message: 'QR login session not found or expired' });
      return;
    }
    const parsed = JSON.parse(value) as { approved?: boolean; userId?: string };
    if (!parsed.approved || !parsed.userId) {
      res.status(200).json({ success: true, pending: true });
      return;
    }

    // Create a session and tokens for the approved user
    const userId = parsed.userId;
    const fakeReq = req as Request;
    const refreshToken = generateRefreshToken();
    const session = await createSession(userId, fakeReq, refreshToken);
    const accessToken = signAccessToken({ _id: userId, sessionId: String(session._id) });

    await redis.del(key);
    await logSecurityEvent(userId, 'session_created', req, { source: 'qr_login' });
    void writeAuditLog(req, AuditAction.SESSION_CREATED, {
      actorId: userId,
      metadata: {
        sessionId: String(session._id),
        deviceName: session.deviceName,
        source: 'qr_login',
        expiresAt: session.expiresAt?.toISOString?.(),
      },
    });
    void writeAuditLog(req, AuditAction.USER_SIGNIN, { actorId: userId, metadata: { source: 'qr_login' } });

    res.status(200).json({
      success: true,
      pending: false,
      accessToken,
      refreshToken,
      expiresIn: authConfig.ACCESS_TOKEN_EXPIRY,
      sessionId: session._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}
