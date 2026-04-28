import passport from 'passport';
import type { Request } from 'express';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { env } from '../config/env.js';
import { normalizeGithubProfile } from '../oauth/oauth.profiles.js';
import { handleOAuthProviderAuth } from '../oauth/oauth.service.js';
import { oauthFlowFromReq } from './oauthQuery.js';

const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/github/callback` : '';

export function registerGithub(passportInstance: passport.PassportStatic): void {
  const strategy = new GitHubStrategy(
    {
      clientID: env.GITHUB_CLIENT_ID ?? '',
      clientSecret: env.GITHUB_CLIENT_SECRET ?? '',
      callbackURL,
      scope: ['user:email'],
      passReqToCallback: true,
    },
    async (...args: unknown[]) => {
      const [req, accessToken, _refreshToken, profile, done] = args as [
        Request & { query?: Record<string, unknown> },
        string,
        string,
        Parameters<typeof normalizeGithubProfile>[0],
        (err: Error | null, user?: unknown) => void,
      ];
      try {
        const flow = oauthFlowFromReq(req);
        const normalized = normalizeGithubProfile(profile);
        const user = await handleOAuthProviderAuth({
          provider: 'github',
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
