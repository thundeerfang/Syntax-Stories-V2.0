import passport from 'passport';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { UserModel } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { env } from '../config/env';
import { getRedis } from '../config/redis';
import { writeAuditLog } from '../utils/auditLog';

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
        { query?: Record<string, unknown> },
        string,
        string,
        passport.Profile,
        (err: Error | null, user?: unknown) => void,
      ];
      try {
        const flow = String(req?.query?.state ?? 'login');
        const email = profile.emails?.[0]?.value ?? profile.username + '@twitter.placeholder';
        if (flow.startsWith('link:')) {
          const linkKey = flow.slice(5);
          const redis = getRedis();
          if (!redis) return done(new Error('Linking unavailable'), undefined);
          const userId = await redis.get(`link:${linkKey}`);
          if (!userId) return done(new Error('Link expired or invalid'), undefined);
          const user = await UserModel.findById(userId).select('+xToken');
          if (!user) return done(new Error('User not found'), undefined);
          const accountEmail = (user.email ?? '').toLowerCase();
          const providerEmail = (email ?? '').toLowerCase();
          if (accountEmail !== providerEmail) {
            return done(
              new Error(`Use the same email as your account (${user.email}) to connect X.`),
              undefined
            );
          }
          user.xId = profile.id;
          user.xToken = accessToken;
          user.isXAccount = true;
          await user.save();
          await redis.del(`link:${linkKey}`);
          void writeAuditLog(req as import('express').Request, 'oauth_connected', {
            actorId: String(user._id),
            metadata: { provider: 'x' },
          });
          return done(null, { _id: user._id, xId: user.xId });
        }
        if (flow === 'login') {
          const existingUser = await UserModel.findOne({ xId: profile.id }).select('+xToken');
          if (!existingUser || !existingUser.isXAccount) {
            return done(
              new Error('No account is linked to this X. Please sign up or link X from settings.'),
              undefined
            );
          }
          existingUser.xToken = accessToken;
          await existingUser.save();
          return done(null, { _id: existingUser._id, xId: existingUser.xId });
        }

        const existingByEmail = await UserModel.findOne({ email });
        if (existingByEmail) {
          return done(
            new Error('An account with this email already exists. Please sign in, then link X from settings.'),
            undefined
          );
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
        done(null, { _id: newUser._id, xId: newUser.xId });
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );
  passportInstance.use(strategy as passport.Strategy);
}
