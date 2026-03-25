import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import type { Request } from 'express';
import { UserModel, DEFAULT_AVATAR_URL } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { env } from '../config/env';
import { getRedis } from '../config/redis';
import { writeAuditLog } from '../utils/auditLog';

const DISCORD_API = 'https://discord.com/api';

export const hasDiscordConfig = !!(
  env.DISCORD_CLIENT_ID &&
  env.DISCORD_CLIENT_SECRET &&
  env.BACKEND_URL
);

const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/discord/callback` : '';

export type DiscordMe = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
};

async function fetchDiscordProfile(accessToken: string): Promise<DiscordMe> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord profile failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<DiscordMe>;
}

function discordAvatarUrl(user: DiscordMe): string {
  if (!user.avatar) return DEFAULT_AVATAR_URL;
  const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
}

export function registerDiscord(passportInstance: passport.PassportStatic): void {
  if (!hasDiscordConfig || !callbackURL) return;

  const strategy = new OAuth2Strategy(
    {
      authorizationURL: `${DISCORD_API}/oauth2/authorize`,
      tokenURL: `${DISCORD_API}/oauth2/token`,
      clientID: env.DISCORD_CLIENT_ID!,
      clientSecret: env.DISCORD_CLIENT_SECRET!,
      callbackURL,
      scope: ['identify', 'email'],
      passReqToCallback: true,
    },
    async (
      req: Request,
      accessToken: string,
      _refreshToken: string,
      profile: DiscordMe,
      done: (err: Error | null, user?: unknown) => void
    ) => {
      try {
        const flow = String((req.query as Record<string, unknown>)?.state ?? 'login');
        const discordUser = profile;
        const email = discordUser.email?.trim()?.toLowerCase();
        if (!email) {
          return done(
            new Error(
              'Discord did not return an email. Enable email on your Discord account or allow email scope.'
            ),
            undefined
          );
        }

        if (flow.startsWith('link:')) {
          const linkKey = flow.slice(5);
          const redis = getRedis();
          if (!redis) return done(new Error('Linking unavailable'), undefined);
          const userId = await redis.get(`link:${linkKey}`);
          if (!userId) return done(new Error('Link expired or invalid'), undefined);
          const user = await UserModel.findById(userId).select('+discordToken');
          if (!user) return done(new Error('User not found'), undefined);
          const accountEmail = (user.email ?? '').toLowerCase();
          if (accountEmail !== email) {
            return done(
              new Error(`Use the same email as your account (${user.email}) to connect Discord.`),
              undefined
            );
          }
          user.discordId = discordUser.id;
          user.discordToken = accessToken;
          user.isDiscordAccount = true;
          await user.save();
          await redis.del(`link:${linkKey}`);
          void writeAuditLog(req, 'oauth_connected', {
            actorId: String(user._id),
            metadata: { provider: 'discord' },
          });
          return done(null, { _id: user._id, discordId: user.discordId });
        }

        if (flow === 'login') {
          const existingUser = await UserModel.findOne({ discordId: discordUser.id }).select('+discordToken');
          if (!existingUser || !existingUser.isDiscordAccount) {
            return done(
              new Error('No account is linked to this Discord. Please sign up or link Discord from settings.'),
              undefined
            );
          }
          existingUser.discordToken = accessToken;
          await existingUser.save();
          return done(null, { _id: existingUser._id, discordId: existingUser.discordId });
        }

        const existingByEmail = await UserModel.findOne({ email });
        if (existingByEmail) {
          return done(
            new Error('An account with this email already exists. Please sign in, then link Discord from settings.'),
            undefined
          );
        }

        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        const baseUsername = (discordUser.username || 'user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user';
        const fullName = (discordUser.global_name ?? discordUser.username ?? 'User').trim() || 'User';
        const profileImg = discordAvatarUrl(discordUser);

        const newUser = new UserModel({
          fullName,
          username: `${baseUsername}${randomNumber}`,
          discordId: discordUser.id,
          email,
          profileImg,
          bio: 'Welcome to Syntax Stories 🧑🏻‍💻',
          discordToken: accessToken,
          isGoogleAccount: false,
          isGitAccount: false,
          isFacebookAccount: false,
          isXAccount: false,
          isAppleAccount: false,
          isDiscordAccount: true,
        });
        await newUser.save();
        const subscription = await SubscriptionModel.create({
          userId: newUser._id,
          plan: 'free',
          status: 'active',
        });
        newUser.subscription = subscription._id;
        await newUser.save();
        done(null, { _id: newUser._id, discordId: newUser.discordId });
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  strategy.userProfile = function (accessToken, done) {
    fetchDiscordProfile(accessToken)
      .then((d) => done(null, d as unknown as Record<string, unknown>))
      .catch((err) => done(err as Error));
  };

  strategy.name = 'discord';
  passportInstance.use(strategy as passport.Strategy);
}
