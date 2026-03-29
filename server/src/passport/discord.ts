import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { fetchDiscordMe, normalizeDiscordProfile, type DiscordMeProfile } from '../oauth/oauth.profiles.js';
import { handleOAuthProviderAuth } from '../oauth/oauth.service.js';
import { oauthFlowFromReq } from './oauthQuery.js';

export const hasDiscordConfig = !!(
  env.DISCORD_CLIENT_ID &&
  env.DISCORD_CLIENT_SECRET &&
  env.BACKEND_URL
);

const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/discord/callback` : '';

export type DiscordMe = DiscordMeProfile;

export function registerDiscord(passportInstance: passport.PassportStatic): void {
  if (!hasDiscordConfig || !callbackURL) return;

  const strategy = new OAuth2Strategy(
    {
      authorizationURL: 'https://discord.com/api/oauth2/authorize',
      tokenURL: 'https://discord.com/api/oauth2/token',
      clientID: env.DISCORD_CLIENT_ID!,
      clientSecret: env.DISCORD_CLIENT_SECRET!,
      callbackURL,
      scope: ['identify', 'email'],
      passReqToCallback: true,
    },
    async (
      req: Request,
      accessToken: string,
      _refreshToken: string,
      profile: DiscordMeProfile,
      done: (err: Error | null, user?: unknown) => void
    ) => {
      try {
        const flow = oauthFlowFromReq(req);
        const normalized = normalizeDiscordProfile(profile);
        const user = await handleOAuthProviderAuth({
          provider: 'discord',
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

  strategy.userProfile = function (accessToken, done) {
    fetchDiscordMe(accessToken)
      .then((d) => done(null, d as unknown as Record<string, unknown>))
      .catch((err) => done(err as Error));
  };

  strategy.name = 'discord';
  passportInstance.use(strategy as passport.Strategy);
}
