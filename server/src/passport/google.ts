import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { env } from '../config/env';

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
          const flow = String((req.query as Record<string, unknown>)?.state ?? 'login'); // "login" | "signup"
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Email not provided by Google'), undefined);

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
          done(null, { _id: newUser._id, googleId: newUser.googleId });
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    )
  );
}
