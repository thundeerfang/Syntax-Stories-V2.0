import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { UserModel } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { env } from '../config/env';
import { getRedis } from '../config/redis';

const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/github/callback` : '';

interface GitHubProfile {
  _json?: { email?: string; name?: string };
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
      passReqToCallback: true,
    },
    async (...args: unknown[]) => {
      const [req, accessToken, _refreshToken, profile, done] = args as [
        { query?: Record<string, unknown> },
        string,
        string,
        GitHubProfile,
        (err: Error | null, user?: unknown) => void,
      ];
      try {
        const flow = String(req?.query?.state ?? 'login');
        const email =
          profile._json?.email ??
          profile.emails?.find((e) => e.primary)?.value;
        if (!email) {
          return done(new Error('Email is required but not available from GitHub'), undefined);
        }

        if (flow.startsWith('link:')) {
          const linkKey = flow.slice(5);
          const redis = getRedis();
          if (!redis) return done(new Error('Linking unavailable'), undefined);
          const userId = await redis.get(`link:${linkKey}`);
          if (!userId) return done(new Error('Link expired or invalid'), undefined);
          const user = await UserModel.findById(userId).select('+githubToken');
          if (!user) return done(new Error('User not found'), undefined);
          const accountEmail = (user.email ?? '').toLowerCase();
          const providerEmail = (email ?? '').toLowerCase();
          if (accountEmail !== providerEmail) {
            return done(
              new Error(`Use the same email as your account (${user.email}) to connect GitHub.`),
              undefined
            );
          }
          user.gitId = String(profile.id);
          user.githubToken = accessToken;
          user.isGitAccount = true;
          await user.save();
          await redis.del(`link:${linkKey}`);
          return done(null, { _id: user._id, gitId: user.gitId });
        }

        if (flow === 'login') {
          const existingUser = await UserModel.findOne({ gitId: String(profile.id) }).select('+githubToken');
          if (!existingUser || !existingUser.isGitAccount) {
            return done(
              new Error('No account is linked to this GitHub. Please sign up or link GitHub from settings.'),
              undefined
            );
          }
          existingUser.githubToken = accessToken;
          await existingUser.save();
          return done(null, { _id: existingUser._id, gitId: existingUser.gitId });
        }

        const existingByEmail = await UserModel.findOne({ email });
        if (existingByEmail) {
          return done(
            new Error('An account with this email already exists. Please sign in, then link GitHub from settings.'),
            undefined
          );
        }

        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        const fullName =
          (profile._json?.name ?? profile.displayName ?? profile.username)?.trim() || 'User';
        const newUser = new UserModel({
          fullName,
          username: (profile.username ?? 'user') + randomNumber,
          gitId: String(profile.id),
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
        done(null, { _id: newUser._id, gitId: newUser.gitId });
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );
  passportInstance.use(strategy as passport.Strategy);
}
