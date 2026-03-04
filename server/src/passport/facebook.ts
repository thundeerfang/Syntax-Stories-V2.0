import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { UserModel } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { env } from '../config/env';

export const hasFacebookConfig = !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET);
const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/facebook/callback` : '';

export function registerFacebook(passportInstance: passport.PassportStatic): void {
  if (!hasFacebookConfig) return;
  passportInstance.use(
    new FacebookStrategy(
      {
        clientID: env.FACEBOOK_APP_ID!,
        clientSecret: env.FACEBOOK_APP_SECRET!,
        callbackURL,
        profileFields: ['id', 'displayName', 'emails'],
        passReqToCallback: true,
      },
      async (req, accessToken, _refreshToken, profile, done) => {
        try {
          const flow = String((req.query as Record<string, unknown>)?.state ?? 'login');
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Email not available from Facebook'), undefined);

          if (flow === 'login') {
            const existingUser = await UserModel.findOne({ facebookId: profile.id }).select('+facebookToken');
            if (!existingUser || !existingUser.isFacebookAccount) {
              return done(
                new Error('No account is linked to this Facebook. Please sign up or link Facebook from settings.'),
                undefined
              );
            }
            existingUser.facebookToken = accessToken;
            await existingUser.save();
            return done(null, { _id: existingUser._id, facebookId: existingUser.facebookId });
          }

          const existingByEmail = await UserModel.findOne({ email });
          if (existingByEmail) {
            return done(
              new Error('An account with this email already exists. Please sign in, then link Facebook from settings.'),
              undefined
            );
          }

          const randomNumber = Math.floor(1000 + Math.random() * 9000);
          const newUser = new UserModel({
            fullName: profile.displayName ?? 'User',
            facebookId: profile.id,
            facebookToken: accessToken,
            username: (profile.displayName ?? 'user').trim().toLowerCase().replace(/\s+/g, '') + randomNumber,
            email,
            profileImg: profile.photos?.[0]?.value ?? 'https://res.cloudinary.com/dr2bxpjjz/image/upload/v1737041910/uploads/waumti9zvnnmgayfxbmv.png',
            isGoogleAccount: false,
            isGitAccount: false,
            isFacebookAccount: true,
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
          done(null, { _id: newUser._id, facebookId: newUser.facebookId });
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    )
  );
}
