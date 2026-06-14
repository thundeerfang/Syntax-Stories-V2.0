import passport from "passport";
import OAuth2Strategy from "passport-oauth2";
import type { Request } from "express";
import { env } from "../config/env.js";
import {
  fetchTwitchMe,
  normalizeTwitchProfile,
  type TwitchMeProfile,
} from "../oauth/oauth.profiles.js";
import { handleOAuthProviderAuth } from "../oauth/oauth.service.js";
import { oauthFlowFromReq } from "./oauthQuery.js";
export const hasTwitchConfig = !!(
  env.TWITCH_CLIENT_ID &&
  env.TWITCH_CLIENT_SECRET &&
  env.BACKEND_URL
);
const callbackURL = env.BACKEND_URL
  ? `${env.BACKEND_URL}/auth/twitch/callback`
  : "";
export function registerTwitch(
  passportInstance: passport.PassportStatic,
): void {
  if (!hasTwitchConfig || !callbackURL) return;
  const strategy = new OAuth2Strategy(
    {
      authorizationURL: "https://id.twitch.tv/oauth2/authorize",
      tokenURL: "https://id.twitch.tv/oauth2/token",
      clientID: env.TWITCH_CLIENT_ID!,
      clientSecret: env.TWITCH_CLIENT_SECRET!,
      callbackURL,
      scope: ["user:read:email"],
      passReqToCallback: true,
    },
    async (
      req: Request,
      accessToken: string,
      _refreshToken: string,
      profile: TwitchMeProfile,
      done: (err: Error | null, user?: unknown) => void,
    ) => {
      try {
        const flow = oauthFlowFromReq(req);
        const normalized = normalizeTwitchProfile(profile);
        const user = await handleOAuthProviderAuth({
          provider: "twitch",
          flow,
          accessToken,
          normalized,
          req,
        });
        done(null, user);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );
  strategy.userProfile = function (accessToken, done) {
    fetchTwitchMe(accessToken, env.TWITCH_CLIENT_ID!)
      .then((user) => done(null, user as unknown as Record<string, unknown>))
      .catch((err) => done(err as Error));
  };
  strategy.name = "twitch";
  passportInstance.use(strategy as passport.Strategy);
}
