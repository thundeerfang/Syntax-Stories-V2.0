import { Request, Response } from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { UserModel } from '../models/User';
import { SessionModel } from '../models/Session';
import { SecurityEventModel } from '../models/SecurityEvent';
import { SubscriptionModel } from '../models/Subscription';
import { authConfig } from '../config/auth.config';
import { signAccessToken } from '../config/jwt';
import { getRedis } from '../config/redis';
import { env } from '../config/env';
import type { AuthUser } from '../middlewares/auth';

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS,
  },
});

const OTP_PREFIX = 'otp:email:';
const OTP_TTL = (authConfig.OTP_TTL_SECONDS || 600) * 1000;
const INTENT_PREFIX = 'intent:user:';
const INTENT_TTL_SECONDS = 5 * 60;

const ALLOWED_INTENT_ACTIONS = ['delete_account'] as const;
type IntentAction = (typeof ALLOWED_INTENT_ACTIONS)[number];

function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

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

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

function parseUserAgent(ua: string): string {
  if (!ua) return 'Unknown device';
  const match = ua.match(/\((.*?)\)/);
  const os = match ? match[1] : ua.substring(0, 50);
  const mobile = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';
  return `${mobile} - ${os}`;
}

async function createSession(
  userId: string,
  req: Request,
  refreshToken: string
): Promise<InstanceType<typeof SessionModel>> {
  const { ip, userAgent } = getClientMeta(req);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days in browser
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

async function logSecurityEvent(
  userId: string | null,
  type: string,
  req: Request,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { ip, userAgent } = getClientMeta(req);
  try {
    const doc: Record<string, unknown> = { type, ip, userAgent, metadata };
    if (userId) doc.userId = userId;
    await SecurityEventModel.create(doc);
  } catch (e) {
    console.error('SecurityEvent log failed:', e);
  }
}

async function storeOtp(
  email: string,
  payload: { code: string; fullName?: string; gender?: string; job?: string }
): Promise<void> {
  const redis = getRedis();
  const key = OTP_PREFIX + email.toLowerCase().trim();
  const value = JSON.stringify(payload);
  if (redis) {
    await redis.setEx(key, Math.ceil(OTP_TTL / 1000), value);
    return;
  }
  throw new Error('Redis required for OTP');
}

async function getOtp(
  email: string
): Promise<{ code: string; fullName?: string; gender?: string; job?: string } | null> {
  const redis = getRedis();
  const key = OTP_PREFIX + email.toLowerCase().trim();
  if (!redis) return null;
  const value = await redis.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as {
      code: string;
      fullName?: string;
      gender?: string;
      job?: string;
    };
  } catch {
    return null;
  }
}

async function deleteOtp(email: string): Promise<void> {
  const redis = getRedis();
  const key = OTP_PREFIX + email.toLowerCase().trim();
  if (redis) await redis.del(key);
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
  const key = INTENT_PREFIX + tokenHash;
  const payload = JSON.stringify({ userId, action });
  await redis.setEx(key, INTENT_TTL_SECONDS, payload);
  return { token: rawToken, expiresIn: INTENT_TTL_SECONDS };
}

export async function sendOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    const normalizedEmail = email.toLowerCase().trim();
    const code = generateOtpCode();
    await storeOtp(normalizedEmail, { code });
    await transporter.sendMail({
      from: env.EMAIL_USER ?? 'noreply@syntaxstories.com',
      to: normalizedEmail,
      subject: 'Your Syntax Stories login code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f9; color: #333;">
          <h2 style="color: #5f4fe6;">Your verification code</h2>
          <p style="font-size: 16px;">Use this code to sign in:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
          <p style="font-size: 14px; color: #666;">This code expires in 10 minutes.</p>
        </div>
      `,
    });
    res.status(200).json({ message: 'Verification code sent to your email 📧', success: true });
  } catch (err) {
    console.error(err);
    const message =
      (err as Error).message === 'Redis required for OTP'
        ? 'Service temporarily unavailable. Try again later.'
        : 'Internal Server Error 💀';
    res.status(500).json({ message, success: false });
  }
}

export async function signupEmail(req: Request, res: Response): Promise<void> {
  try {
    const {
      firstName,
      lastName,
      email,
      gender,
      job,
    } = req.body as {
      firstName: string;
      lastName: string;
      email: string;
      gender?: string;
      job?: string;
    };
    const normalizedEmail = email.toLowerCase().trim();
    const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ').trim() || 'User';
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({
        message: 'An account with this email already exists. Sign in with email instead.',
        success: false,
      });
      return;
    }
    const code = generateOtpCode();
    await storeOtp(normalizedEmail, {
      code,
      fullName,
      gender: gender?.trim() || undefined,
      job: job?.trim() || undefined,
    });
    await transporter.sendMail({
      from: env.EMAIL_USER ?? 'noreply@syntaxstories.com',
      to: normalizedEmail,
      subject: 'Verify your Syntax Stories account',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f9; color: #333;">
          <h2 style="color: #5f4fe6;">Welcome to Syntax Stories</h2>
          <p style="font-size: 16px;">Your verification code:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
          <p style="font-size: 14px; color: #666;">This code expires in 10 minutes.</p>
        </div>
      `,
    });
    res.status(200).json({ message: 'Verification code sent to your email 📧', success: true });
  } catch (err) {
    console.error(err);
    const message =
      (err as Error).message === 'Redis required for OTP'
        ? 'Service temporarily unavailable.'
        : 'Internal Server Error 💀';
    res.status(500).json({ message, success: false });
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, code } = req.body as { email: string; code: string };
    const normalizedEmail = email.toLowerCase().trim();
    const stored = await getOtp(normalizedEmail);
    if (!stored || stored.code !== code) {
      await logSecurityEvent(null, 'login_failure', req, { email: normalizedEmail, reason: 'invalid_otp' });
      res.status(401).json({
        message: 'Invalid or expired code. Request a new one.',
        success: false,
      });
      return;
    }
    await deleteOtp(normalizedEmail);
    let user = await UserModel.findOne({ email: normalizedEmail });
    if (stored.fullName && !user) {
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      const username =
        stored.fullName.trim().toLowerCase().replace(/\s+/g, '') + randomNumber;
      user = new UserModel({
        fullName: stored.fullName,
        username,
        email: normalizedEmail,
        gender: stored.gender,
        job: stored.job,
        isGoogleAccount: false,
        isGitAccount: false,
        isFacebookAccount: false,
        isXAccount: false,
        isAppleAccount: false,
        emailVerified: true,
      });
      await user.save();
      const subscription = await SubscriptionModel.create({
        userId: user._id,
        plan: 'free',
        status: 'active',
      });
      user.subscription = subscription._id;
      await user.save();
      await logSecurityEvent(String(user._id), 'login_success', req, { source: 'signup_email' });
    } else if (user) {
      await logSecurityEvent(String(user._id), 'login_success', req, { source: 'otp' });
    } else {
      res.status(400).json({ message: 'No account found. Sign up first.', success: false });
      return;
    }
    const refreshToken = generateRefreshToken();
    const session = await createSession(String(user._id), req, refreshToken);
    const accessToken = signAccessToken({ _id: String(user._id), sessionId: String(session._id) });
    res.status(200).json({
      message: 'Signed in successfully 🚀',
      success: true,
      accessToken,
      refreshToken,
      expiresIn: authConfig.ACCESS_TOKEN_EXPIRY,
      sessionId: session._id,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profileImg: user.profileImg,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
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
    session.lastActiveAt = new Date();
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
        }
      }
    }
    res.status(200).json({ message: 'Logged out successfully 👋', success: true });
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
    res.status(200).json({
      success: true,
      user: {
        _id: found._id,
        fullName: found.fullName,
        username: found.username,
        email: found.email,
        profileImg: found.profileImg,
        isGoogleAccount: found.isGoogleAccount,
        isGitAccount: found.isGitAccount,
      },
    });
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

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ message: 'Unauthorized', success: false });
      return;
    }

    const updates = (req.body ?? {}) as Partial<{
      fullName: string;
      bio: string;
      job: string;
      linkedin: string;
      instagram: string;
      github: string;
      profileImg: string;
    }>;

    const updated = await UserModel.findByIdAndUpdate(user._id, updates, {
      new: true,
      runValidators: true,
      projection: { twoFactorSecret: 0 },
    }).lean();

    if (!updated) {
      res.status(404).json({ message: 'User not found', success: false });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        _id: updated._id,
        fullName: updated.fullName,
        username: updated.username,
        email: updated.email,
        profileImg: updated.profileImg,
        bio: updated.bio,
        job: updated.job,
        linkedin: updated.linkedin,
        instagram: updated.instagram,
        github: updated.github,
      },
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

    res.status(200).json({
      success: true,
      message: 'Account deleted (deactivated) successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}

const DISCONNECT_PROVIDERS = ['google', 'github', 'facebook', 'x'] as const;
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
      res.status(400).json({ message: 'Invalid provider. Use: google, github, facebook, x', success: false });
      return;
    }

    const doc = await UserModel.findById(user._id).select('+googleToken +githubToken +facebookToken +xToken');
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
    }

    await UserModel.findByIdAndUpdate(user._id, { $unset: unset, $set: set });
    await SessionModel.updateMany(
      { userId: user._id, revoked: false },
      { $set: { revoked: true } }
    );
    await logSecurityEvent(String(user._id), 'provider_disconnect', req, { provider });

    res.status(200).json({
      success: true,
      message: `Disconnected from ${provider}. You have been logged out everywhere. Your email and account are unchanged.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error 💀', success: false });
  }
}
