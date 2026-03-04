import passport from 'passport';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { UserModel } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { signAccessToken } from '../config/jwt';
import { env } from '../config/env';

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
    },
    async (...args: unknown[]) => {
      const [accessToken, _tokenSecret, profile, done] = args as [string, string, passport.Profile, (err: Error | null, user?: unknown) => void];
      try {
        const email = profile.emails?.[0]?.value ?? profile.username + '@twitter.placeholder';
        const existingUser = await UserModel.findOne({
          $or: [{ email }, { xId: profile.id }],
        }).select('+xToken');
        if (existingUser) {
          existingUser.xId = profile.id;
          existingUser.xToken = accessToken;
          existingUser.isXAccount = true;
          await existingUser.save();
          const tokenPayload = signAccessToken({ _id: existingUser._id, sessionId: existingUser._id });
          return done(null, { _id: existingUser._id, token: tokenPayload, xId: existingUser.xId });
        }

        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        const newUser = new UserModel({
          fullName: profile.displayName ?? profile.username ?? 'User',
          xId: profile.id,
          xToken: accessToken,
          username: (profile.username ?? 'user').toLowerCase() + randomNumber,
          email: email.includes('@twitter.placeholder') ? `x-${profile.id}@syntaxstories.placeholder` : email,
          profileImg: profile.photos?.[0]?.value ?? 'https://res.cloudinary.com/dr2bxpjjz/image/upload/v1737041910/uploads/waumti9zvnnmgayfxbmv.png',
          isGoogleAccount: false,
          isGitAccount: false,
          isFacebookAccount: false,
          isXAccount: true,
          isAppleAccount: false,
        });
        await newUser.save();
        const subscription = await SubscriptionModel.create({
          userId: newUser._id,
          plan: 'free',
          status: 'active',
        });
        newUser.subscription = subscription._id;
        await newUser.save();
        const tokenPayload = signAccessToken({ _id: newUser._id, sessionId: newUser._id });
        done(null, { _id: newUser._id, token: tokenPayload, xId: newUser.xId });
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );
  passportInstance.use(strategy as passport.Strategy);
}
