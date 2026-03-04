import passport from 'passport';
import { UserModel } from '../models/User';
import { registerGoogle } from './google';
import { registerGithub } from './github';
import { registerFacebook, hasFacebookConfig } from './facebook';
import { registerX, hasXConfig } from './x';

registerGoogle(passport);
registerGithub(passport);
registerFacebook(passport);
registerX(passport);

passport.serializeUser((user: Express.User, done) => {
  const u = user as { _id?: unknown; token?: string; googleId?: string; gitId?: string; facebookId?: string; xId?: string };
  done(null, {
    id: u._id,
    _id: u._id,
    token: u.token,
    googleId: u.googleId,
    gitId: u.gitId,
    facebookId: u.facebookId,
    xId: u.xId,
  });
});

passport.deserializeUser(async (data: { id?: string; _id?: string; token?: string; googleId?: string; gitId?: string; facebookId?: string; xId?: string }, done) => {
  try {
    const id = data.id ?? data._id;
    const user = await UserModel.findOne({
      $or: [
        ...(id ? [{ _id: id }] : []),
        ...(data.googleId ? [{ googleId: data.googleId }] : []),
        ...(data.gitId ? [{ gitId: data.gitId }] : []),
        ...(data.facebookId ? [{ facebookId: data.facebookId }] : []),
        ...(data.xId ? [{ xId: data.xId }] : []),
      ].filter(Boolean),
    });
    if (!user) return done(null, false);
    done(null, { user, token: data.token });
  } catch (err) {
    done(err as Error, undefined);
  }
});

export default passport;
export { hasFacebookConfig, hasXConfig };
