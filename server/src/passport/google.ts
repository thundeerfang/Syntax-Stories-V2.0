import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { signAccessToken } from '../config/jwt';
import { env } from '../config/env';

const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/google/callback` : '';

export function registerGoogle(passportInstance: passport.PassportStatic): void {
  passportInstance.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
        callbackURL,
      },
      async (accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Email not provided by Google'), undefined);

          const existingUser = await UserModel.findOne({ email }).select('+googleToken');
          if (existingUser) {
            existingUser.googleId = profile.id;
            existingUser.googleToken = accessToken;
            existingUser.isGoogleAccount = true;
            await existingUser.save();
            const token = signAccessToken({ _id: existingUser._id, sessionId: existingUser._id });
            return done(null, { _id: existingUser._id, token, googleId: existingUser.googleId });
          }

          const randomNumber = Math.floor(1000 + Math.random() * 9000);
          const newUser = new UserModel({
            fullName: profile.displayName ?? 'User',
            googleId: profile.id,
            googleToken: accessToken,
            username: (profile.displayName ?? 'user').trim().replace(/\s+/g, '').toLowerCase() + randomNumber,
            email,
            profileImg: '/uploads/waumti9zvnnmgayfxbmv',
            bio: 'Welcome to Syntax Stories 🧑🏻‍💻',
            isGoogleAccount: true,
            isGitAccount: false,
            isFacebookAccount: false,
            isXAccount: false,
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
          const token = signAccessToken({ _id: newUser._id, sessionId: newUser._id });
          done(null, { _id: newUser._id, token, googleId: newUser.googleId });
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    )
  );
}
