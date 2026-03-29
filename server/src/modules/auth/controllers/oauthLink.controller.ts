import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { UserModel } from '../../../models/User.js';
import { SessionModel } from '../../../models/Session.js';
import { getRedis } from '../../../config/redis.js';
import { env } from '../../../config/env.js';
import type { AuthUser } from '../../../middlewares/auth/index.js';
import { writeAuditLog } from '../../../shared/audit/auditLog.js';
import { AuditAction } from '../../../shared/audit/events.js';
import { redisKeys } from '../../../shared/redis/keys.js';
import { logSecurityEvent } from '../securityEventLog.js';

const LINK_TTL_SEC = 300; // 5 min
const LINK_PROVIDERS = ['google', 'github', 'facebook', 'x', 'discord'] as const;
type LinkProvider = (typeof LINK_PROVIDERS)[number];

const DISCONNECT_PROVIDERS = ['google', 'github', 'facebook', 'x', 'discord'] as const;
type DisconnectProvider = (typeof DISCONNECT_PROVIDERS)[number];

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
