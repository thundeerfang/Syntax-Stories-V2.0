import passport from "passport";
import { UserModel } from "../models/User.js";
import { registerGoogle } from "./google.js";
import { registerGithub } from "./github.js";
import { registerFacebook } from "./facebook.js";
import { registerX } from "./x.js";
import { registerDiscord } from "./discord.js";
import { registerTwitch } from "./twitch.js";
registerGoogle(passport);
registerGithub(passport);
registerFacebook(passport);
registerX(passport);
registerDiscord(passport);
registerTwitch(passport);
passport.serializeUser((user: Express.User, done) => {
  const u = user as {
    _id?: unknown;
    token?: string;
    googleId?: string;
    gitId?: string;
    facebookId?: string;
    xId?: string;
    discordId?: string;
    twitchId?: string;
  };
  done(null, {
    id: u._id,
    _id: u._id,
    token: u.token,
    googleId: u.googleId,
    gitId: u.gitId,
    facebookId: u.facebookId,
    xId: u.xId,
    discordId: u.discordId,
    twitchId: u.twitchId,
  });
});
passport.deserializeUser(
  async (
    data: {
      id?: string;
      _id?: string;
      token?: string;
      googleId?: string;
      gitId?: string;
      facebookId?: string;
      xId?: string;
      discordId?: string;
      twitchId?: string;
    },
    done,
  ) => {
    try {
      const id = data.id ?? data._id;
      const user = await UserModel.findOne({
        $or: [
          ...(id ? [{ _id: id }] : []),
          ...(data.googleId ? [{ googleId: data.googleId }] : []),
          ...(data.gitId ? [{ gitId: data.gitId }] : []),
          ...(data.facebookId ? [{ facebookId: data.facebookId }] : []),
          ...(data.xId ? [{ xId: data.xId }] : []),
          ...(data.discordId ? [{ discordId: data.discordId }] : []),
          ...(data.twitchId ? [{ twitchId: data.twitchId }] : []),
        ].filter(Boolean),
      });
      if (!user) return done(null, false);
      done(null, { user, token: data.token });
    } catch (err) {
      done(err as Error, undefined);
    }
  },
);
export default passport;
export { hasFacebookConfig } from "./facebook.js";
export { hasXConfig } from "./x.js";
export { hasDiscordConfig } from "./discord.js";
export { hasTwitchConfig } from "./twitch.js";
