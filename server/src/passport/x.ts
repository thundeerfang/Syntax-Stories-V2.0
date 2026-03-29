import passport from 'passport';
import type { Request } from 'express';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { env } from '../config/env.js';
import { normalizeXProfile } from '../oauth/oauth.profiles.js';
import { handleOAuthProviderAuth } from '../oauth/oauth.service.js';
import { oauthFlowFromReq } from './oauthQuery.js';

export const hasXConfig = !!(env.X_CONSUMER_KEY && env.X_CONSUMER_SECRET);
const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/x/callback` : '';

export function registerX(passportInstance: passport.PassportStatic): void {
  if (!hasXConfig) return;
  const strategy = new TwitterStrategy(
    {
      consumerKey: env.X_CONSUMER_KEY!,
      consumerSecret: env.X_CONSUMER_SECRET!,
      callbackURL,
      includeEmail: true,
      passReqToCallback: true,
    },
    async (...args: unknown[]) => {
      const [req, accessToken, _tokenSecret, profile, done] = args as [
        Request & { query?: Record<string, unknown> },
        string,
        string,
        Parameters<typeof normalizeXProfile>[0],
        (err: Error | null, user?: unknown) => void,
      ];
      try {
        const flow = oauthFlowFromReq(req);
        const normalized = normalizeXProfile(profile);
        const user = await handleOAuthProviderAuth({
          provider: 'x',
          flow,
          accessToken,
          normalized,
          req,
        });
        done(null, user);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );
  passportInstance.use(strategy as passport.Strategy);
}
