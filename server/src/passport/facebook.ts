import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { UserModel } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { signAccessToken } from '../config/jwt';
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
      },
      async (accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Email not available from Facebook'), undefined);

          const existingUser = await UserModel.findOne({ email }).select('+facebookToken');
          if (existingUser) {
            existingUser.facebookId = profile.id;
            existingUser.facebookToken = accessToken;
            existingUser.isFacebookAccount = true;
            await existingUser.save();
            const token = signAccessToken({ _id: existingUser._id, sessionId: existingUser._id });
            return done(null, { _id: existingUser._id, token, facebookId: existingUser.facebookId });
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
          const token = signAccessToken({ _id: newUser._id, sessionId: newUser._id });
          done(null, { _id: newUser._id, token, facebookId: newUser.facebookId });
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    )
  );
}
