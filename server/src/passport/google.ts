import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../config/env.js';
import { normalizeGoogleProfile } from '../oauth/oauth.profiles.js';
import { handleOAuthProviderAuth } from '../oauth/oauth.service.js';
import { oauthFlowFromReq } from './oauthQuery.js';

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
          const flow = oauthFlowFromReq(req);
          const normalized = normalizeGoogleProfile(profile);
          const user = await handleOAuthProviderAuth({
            provider: 'google',
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
    )
  );
}
