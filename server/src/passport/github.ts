import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { UserModel } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { signAccessToken } from '../config/jwt';
import { env } from '../config/env';

const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/github/callback` : '';

interface GitHubProfile {
  _json?: { email?: string };
  emails?: Array<{ value: string; primary?: boolean }>;
  displayName?: string;
  username?: string;
  id: string;
}

export function registerGithub(passportInstance: passport.PassportStatic): void {
  const strategy = new GitHubStrategy(
    {
      clientID: env.GITHUB_CLIENT_ID ?? '',
      clientSecret: env.GITHUB_CLIENT_SECRET ?? '',
      callbackURL,
      scope: ['user:email'],
    },
    async (...args: unknown[]) => {
      const [accessToken, _refreshToken, profile, done] = args as [string, string, GitHubProfile, (err: Error | null, user?: unknown) => void];
      try {
        const email =
          profile._json?.email ??
          profile.emails?.find((e) => e.primary)?.value;
        if (!email) {
          return done(new Error('Email is required but not available from GitHub'), undefined);
        }

        const existingUser = await UserModel.findOne({ email }).select('+githubToken');
        if (existingUser) {
          existingUser.gitId = String(profile.id) + Math.floor(10 ** 12 + Math.random() * 9 * 10 ** 12);
          existingUser.githubToken = accessToken;
          existingUser.isGitAccount = true;
          await existingUser.save();
          const token = signAccessToken({ _id: existingUser._id, sessionId: existingUser._id });
          return done(null, { _id: existingUser._id, token, gitId: existingUser.gitId });
        }

        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        const newUser = new UserModel({
          fullName: profile.displayName ?? profile.username ?? 'User',
          username: (profile.username ?? 'user') + randomNumber,
          gitId: String(profile.id) + Math.floor(10 ** 12 + Math.random() * 9 * 10 ** 12),
          email,
          profileImg: '/uploads/waumti9zvnnmgayfxbmv',
          bio: 'Welcome to Syntax Stories 🧑🏻‍💻',
          github: `https://github.com/${profile.username}`,
          githubToken: accessToken,
          isGoogleAccount: false,
          isGitAccount: true,
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
        done(null, { _id: newUser._id, token, gitId: newUser.gitId });
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );
  passportInstance.use(strategy as passport.Strategy);
}
