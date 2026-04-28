import type { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { UserModel, normalizeProfileImg } from '../../../models/User.js';
import { authConfig } from '../../../config/auth.config.js';
import { signAccessToken } from '../../../config/jwt.js';
import { getRedis } from '../../../config/redis.js';
import type { AuthUser } from '../../../middlewares/auth/index.js';
import { consumeAuthChallenge } from '../../../utils/authChallenge.js';
import { writeAuditLog } from '../../../shared/audit/auditLog.js';
import { AuditAction } from '../../../shared/audit/events.js';
import { redisKeys } from '../../../shared/redis/keys.js';
import { logSecurityEvent } from '../securityEventLog.js';
import { createSession, generateRefreshToken } from '../../../services/session.service.js';

const TWO_FA_SETUP_TTL_SECONDS = 10 * 60;

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
