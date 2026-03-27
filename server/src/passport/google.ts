import passport from 'passport';
import type { Request } from 'express';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../config/env';
import { normalizeGoogleProfile } from '../oauth/oauth.profiles';
import { handleOAuthProviderAuth } from '../oauth/oauth.service';

const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/google/callback` : '';

export function registerGoogle(passportInstance: passport.PassportStatic): void {
  passportInstance.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
        callbackURL,
        passReqToCallback: true,
      },
      async (req, accessToken, _refreshToken, profile, done) => {
        try {
          const flow = String((req.query as Record<string, unknown>)?.state ?? 'login');
          const normalized = normalizeGoogleProfile(profile);
          const user = await handleOAuthProviderAuth({
            provider: 'google',
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
