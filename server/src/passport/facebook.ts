import passport from 'passport';
import type { Request } from 'express';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { env } from '../config/env';
import { normalizeFacebookProfile } from '../oauth/oauth.profiles';
import { handleOAuthProviderAuth } from '../oauth/oauth.service';

export const hasFacebookConfig = !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET);
const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/facebook/callback` : '';

export function registerFacebook(passportInstance: passport.PassportStatic): void {
  if (!hasFacebookConfig) return;
  passportInstance.use(
    new FacebookStrategy(
      {
        clientID: env.FACEBOOK_APP_ID!,
        clientSecret: env.FACEBOOK_APP_SECRET!,
        callbackURL,
        profileFields: ['id', 'displayName', 'emails'],
        passReqToCallback: true,
      },
      async (req, accessToken, _refreshToken, profile, done) => {
        try {
          const flow = String((req.query as Record<string, unknown>)?.state ?? 'login');
          const normalized = normalizeFacebookProfile(profile);
          const user = await handleOAuthProviderAuth({
            provider: 'facebook',
            flow,
            accessToken,
            normalized,
            req: req as Request,
          });
          done(null, user);
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    )
  );
}
