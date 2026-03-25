import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel, DEFAULT_AVATAR_URL } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { env } from '../config/env';
import { getRedis } from '../config/redis';
import { writeAuditLog } from '../utils/auditLog';

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
          const flow = String((req.query as Record<string, unknown>)?.state ?? 'login'); // "login" | "signup" | "link:key"
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Email not provided by Google'), undefined);

          // Link: add Google to existing account (same email only)
          if (flow.startsWith('link:')) {
            const linkKey = flow.slice(5);
            const redis = getRedis();
            if (!redis) return done(new Error('Linking unavailable'), undefined);
            const userId = await redis.get(`link:${linkKey}`);
            if (!userId) return done(new Error('Link expired or invalid'), undefined);
            const user = await UserModel.findById(userId).select('+googleToken');
            if (!user) return done(new Error('User not found'), undefined);
            const accountEmail = (user.email ?? '').toLowerCase();
            const providerEmail = (email ?? '').toLowerCase();
            if (accountEmail !== providerEmail) {
              return done(
                new Error(`Use the same email as your account (${user.email}) to connect Google.`),
                undefined
              );
            }
            user.googleId = profile.id;
            user.googleToken = accessToken;
            user.isGoogleAccount = true;
            await user.save();
            await redis.del(`link:${linkKey}`);
            void writeAuditLog(req as import('express').Request, 'oauth_connected', {
              actorId: String(user._id),
              metadata: { provider: 'google' },
            });
            return done(null, { _id: user._id, googleId: user.googleId });
          }

          if (flow === 'login') {
            const existingUser = await UserModel.findOne({ googleId: profile.id }).select('+googleToken');
            if (!existingUser || !existingUser.isGoogleAccount) {
              return done(
                new Error('No account is linked to this Google. Please sign up or link Google from settings.'),
                undefined
              );
            }
            existingUser.googleToken = accessToken;
            await existingUser.save();
            return done(null, { _id: existingUser._id, googleId: existingUser.googleId });
          }

          // signup
          const existingByEmail = await UserModel.findOne({ email });
          if (existingByEmail) {
            return done(
              new Error('An account with this email already exists. Please sign in, then link Google from settings.'),
              undefined
            );
          }

          const randomNumber = Math.floor(1000 + Math.random() * 9000);
          const photoUrl = (profile as { photos?: Array<{ value?: string }> }).photos?.[0]?.value;
          const profileImg =
            typeof photoUrl === 'string' && photoUrl.startsWith('http') ? photoUrl : DEFAULT_AVATAR_URL;

          const newUser = new UserModel({
            fullName: profile.displayName ?? 'User',
            googleId: profile.id,
            googleToken: accessToken,
            username: (profile.displayName ?? 'user').trim().replace(/\s+/g, '').toLowerCase() + randomNumber,
            email,
            profileImg,
            bio: 'Welcome to Syntax Stories 🧑🏻‍💻',
            isGoogleAccount: true,
            isGitAccount: false,
            isFacebookAccount: false,
            isXAccount: false,
            isAppleAccount: false,
            isDiscordAccount: false,
          });
          await newUser.save();
          const subscription = await SubscriptionModel.create({
            userId: newUser._id,
            plan: 'free',
            status: 'active',
          });
          newUser.subscription = subscription._id;
          await newUser.save();
          done(null, { _id: newUser._id, googleId: newUser.googleId });
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    )
  );
}
