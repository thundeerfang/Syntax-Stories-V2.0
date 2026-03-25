import type { Request, RequestHandler, Response, NextFunction } from 'express';
import passport from 'passport';
import type { AuthenticateOptions } from 'passport';
import { getFrontendRedirectBase } from '../config/frontendUrl';
import { getRedis } from '../config/redis';
import { UserModel } from '../models/User';
import { createAuthChallenge } from '../utils/authChallenge';
import { createSessionAndTokens } from '../controllers/auth.controller';
import { writeAuditLog } from '../utils/auditLog';

/** Validate link key in Redis, then Passport with `state: link:<key>`. */
export function oauthLinkHandler(strategy: string, authenticateOptions: AuthenticateOptions = {}): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const base = getFrontendRedirectBase();
    const k = req.query.k as string;
    if (!k?.trim()) {
      return res.redirect(`${base}/settings?error=${encodeURIComponent('Invalid link request')}`);
    }
    const redis = getRedis();
    if (!redis) {
      return res.redirect(`${base}/settings?error=${encodeURIComponent('Linking unavailable')}`);
    }
    const userId = await redis.get(`link:${k}`);
    if (!userId) {
      return res.redirect(`${base}/settings?error=${encodeURIComponent('Link expired or invalid')}`);
    }
    passport.authenticate(strategy, { ...authenticateOptions, state: `link:${k}` })(req, res, next);
  };
}

export type OAuthCallbackParams = {
  strategy: string;
  failureLabel: string;
  auditProvider: string;
  clientCallbackSlug: string;
  idField: string;
};

export function oauthCallbackHandler(params: OAuthCallbackParams): RequestHandler {
  const { strategy, failureLabel, auditProvider, clientCallbackSlug, idField } = params;
  return (req: Request, res: Response, next: NextFunction) => {
    const base = getFrontendRedirectBase();
    passport.authenticate(strategy, { session: false }, async (err: unknown, userObj?: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : failureLabel;
        return res.redirect(`${base}/login?error=${encodeURIComponent(msg)}`);
      }
      const u = userObj as { _id?: string; [key: string]: unknown } | undefined;
      if (!u?._id) {
        return res.redirect(`${base}/login?error=${encodeURIComponent(failureLabel)}`);
      }
      const dbUser = await UserModel.findById(u._id).lean();
      if (dbUser?.twoFactorEnabled) {
        try {
          const { challengeToken } = await createAuthChallenge(String(u._id));
          return res.redirect(
            `${base}/${clientCallbackSlug}?twoFactorRequired=1&challengeToken=${encodeURIComponent(challengeToken)}`
          );
        } catch {
          return res.redirect(`${base}/login?error=${encodeURIComponent('2FA temporarily unavailable')}`);
        }
      }
      const { accessToken, refreshToken, session } = await createSessionAndTokens(String(u._id), req);
      void writeAuditLog(req, 'session_created', {
        actorId: String(u._id),
        metadata: {
          sessionId: String(session._id),
          deviceName: session.deviceName,
          source: auditProvider,
          expiresAt: session.expiresAt?.toISOString?.(),
        },
      });
      void writeAuditLog(req, 'oauth_login', { actorId: String(u._id), metadata: { provider: auditProvider } });
      void writeAuditLog(req, 'user_signin', { actorId: String(u._id), metadata: { source: auditProvider } });
      const providerId = String(u[idField] ?? '');
      const urlParams = new URLSearchParams({
        token: accessToken,
        refreshToken,
        userId: String(u._id),
        [idField]: providerId,
      });
      return res.redirect(`${base}/${clientCallbackSlug}?${urlParams.toString()}`);
    })(req, res, next);
  };
}
