import type { Request } from 'express';
import { UserModel, DEFAULT_AVATAR_URL, type IUser } from '../models/User';
import { SubscriptionModel } from '../models/Subscription';
import { getRedis } from '../config/redis';
import { writeAuditLog } from '../shared/audit/auditLog';
import { AuditAction } from '../shared/audit/events';
import { redisKeys } from '../shared/redis/keys';
import type { HandleOAuthInput, NormalizedOAuthProfile, OAuthPassportUser, OAuthProviderKey } from './oauth.types';
import { sealProviderToken } from '../shared/crypto/providerTokenCrypto';

const PROVIDER_LABEL: Record<OAuthProviderKey, string> = {
  google: 'Google',
  github: 'GitHub',
  facebook: 'Facebook',
  x: 'X',
  discord: 'Discord',
};

function randomSuffix(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

async function attachFreeSubscription(userId: unknown): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user) return;
  const subscription = await SubscriptionModel.create({
    userId: user._id,
    plan: 'free',
    status: 'active',
  });
  user.subscription = subscription._id;
  await user.save();
}

function signupUsername(provider: OAuthProviderKey, n: NormalizedOAuthProfile): string {
  const r = randomSuffix();
  switch (provider) {
    case 'google':
      return (n.fullName || 'user').trim().replaceAll(/\s+/g, '').toLowerCase() + r;
    case 'github':
      return (n.githubUsername ?? 'user') + r;
    case 'facebook':
      return (n.fullName || 'user').trim().toLowerCase().replaceAll(/\s+/g, '') + r;
    case 'x':
      return (n.xHandle ?? 'user') + r;
    case 'discord':
      return `${n.discordUsernameBase ?? 'user'}${r}`;
    default:
      return `user${r}`;
  }
}

function signupEmail(provider: OAuthProviderKey, n: NormalizedOAuthProfile): string {
  if (provider === 'x' && n.useXSyntheticEmail) {
    return `x-${n.providerId}@syntaxstories.placeholder`;
  }
  return n.email;
}

function sealTok(t: string): string {
  return sealProviderToken(t) ?? t;
}

function newUserBaseDoc(
  provider: OAuthProviderKey,
  n: NormalizedOAuthProfile,
  accessToken: string
): Record<string, unknown> {
  const username = signupUsername(provider, n);
  const email = signupEmail(provider, n);
  const base = {
    fullName: n.fullName,
    username,
    email,
    profileImg: n.profileImg?.startsWith('http') ? n.profileImg : DEFAULT_AVATAR_URL,
    bio: 'Welcome to Syntax Stories 🧑🏻‍💻',
    isGoogleAccount: false,
    isGitAccount: false,
    isFacebookAccount: false,
    isXAccount: false,
    isAppleAccount: false,
    isDiscordAccount: false,
  };

  switch (provider) {
    case 'google':
      return {
        ...base,
        googleId: n.providerId,
        googleToken: sealTok(accessToken),
        isGoogleAccount: true,
      };
    case 'github':
      return {
        ...base,
        gitId: n.providerId,
        githubToken: sealTok(accessToken),
        github: n.githubUrl,
        isGitAccount: true,
      };
    case 'facebook':
      return {
        ...base,
        facebookId: n.providerId,
        facebookToken: sealTok(accessToken),
        isFacebookAccount: true,
      };
    case 'x':
      return {
        ...base,
        xId: n.providerId,
        xToken: sealTok(accessToken),
        isXAccount: true,
      };
    case 'discord':
      return {
        ...base,
        discordId: n.providerId,
        discordToken: sealTok(accessToken),
        isDiscordAccount: true,
      };
    default:
      return base;
  }
}

function passportShape(provider: OAuthProviderKey, user: IUser): OAuthPassportUser {
  const out: OAuthPassportUser = { _id: user._id };
  if (provider === 'google') out.googleId = user.googleId;
  if (provider === 'github') out.gitId = user.gitId;
  if (provider === 'facebook') out.facebookId = user.facebookId;
  if (provider === 'x') out.xId = user.xId;
  if (provider === 'discord') out.discordId = user.discordId;
  return out;
}

async function handleLink(
  req: Request,
  provider: OAuthProviderKey,
  linkKey: string,
  accessToken: string,
  n: NormalizedOAuthProfile
): Promise<OAuthPassportUser> {
  const label = PROVIDER_LABEL[provider];
  const redis = getRedis();
  if (!redis) throw new Error('Linking unavailable');
  const userId = await redis.get(redisKeys.oauth.link(linkKey));
  if (!userId) throw new Error('Link expired or invalid');

  switch (provider) {
    case 'google': {
      const user = await UserModel.findById(userId).select('+googleToken');
      if (!user) throw new Error('User not found');
      const accountEmail = (user.email ?? '').toLowerCase();
      const providerEmail = n.email.toLowerCase();
      if (accountEmail !== providerEmail) {
        throw new Error(`Use the same email as your account (${user.email}) to connect ${label}.`);
      }
      user.googleId = n.providerId;
      user.googleToken = sealTok(accessToken);
      user.isGoogleAccount = true;
      await user.save();
      await redis.del(redisKeys.oauth.link(linkKey));
      void writeAuditLog(req, AuditAction.OAUTH_CONNECTED, {
        actorId: String(user._id),
        metadata: { provider: 'google' },
      });
      return passportShape('google', user);
    }
    case 'github': {
      const user = await UserModel.findById(userId).select('+githubToken');
      if (!user) throw new Error('User not found');
      const accountEmail = (user.email ?? '').toLowerCase();
      const providerEmail = n.email.toLowerCase();
      if (accountEmail !== providerEmail) {
        throw new Error(`Use the same email as your account (${user.email}) to connect ${label}.`);
      }
      user.gitId = n.providerId;
      user.githubToken = sealTok(accessToken);
      user.isGitAccount = true;
      await user.save();
      await redis.del(redisKeys.oauth.link(linkKey));
      void writeAuditLog(req, AuditAction.OAUTH_CONNECTED, {
        actorId: String(user._id),
        metadata: { provider: 'github' },
      });
      return passportShape('github', user);
    }
    case 'facebook': {
      const user = await UserModel.findById(userId).select('+facebookToken');
      if (!user) throw new Error('User not found');
      const accountEmail = (user.email ?? '').toLowerCase();
      const providerEmail = n.email.toLowerCase();
      if (accountEmail !== providerEmail) {
        throw new Error(`Use the same email as your account (${user.email}) to connect ${label}.`);
      }
      user.facebookId = n.providerId;
      user.facebookToken = sealTok(accessToken);
      user.isFacebookAccount = true;
      await user.save();
      await redis.del(redisKeys.oauth.link(linkKey));
      void writeAuditLog(req, AuditAction.OAUTH_CONNECTED, {
        actorId: String(user._id),
        metadata: { provider: 'facebook' },
      });
      return passportShape('facebook', user);
    }
    case 'x': {
      const user = await UserModel.findById(userId).select('+xToken');
      if (!user) throw new Error('User not found');
      const accountEmail = (user.email ?? '').toLowerCase();
      const providerEmail = n.email.toLowerCase();
      if (accountEmail !== providerEmail) {
        throw new Error(`Use the same email as your account (${user.email}) to connect ${label}.`);
      }
      user.xId = n.providerId;
      user.xToken = sealTok(accessToken);
      user.isXAccount = true;
      await user.save();
      await redis.del(redisKeys.oauth.link(linkKey));
      void writeAuditLog(req, AuditAction.OAUTH_CONNECTED, {
        actorId: String(user._id),
        metadata: { provider: 'x' },
      });
      return passportShape('x', user);
    }
    case 'discord': {
      const user = await UserModel.findById(userId).select('+discordToken');
      if (!user) throw new Error('User not found');
      const accountEmail = (user.email ?? '').toLowerCase();
      if (accountEmail !== n.email) {
        throw new Error(`Use the same email as your account (${user.email}) to connect ${label}.`);
      }
      user.discordId = n.providerId;
      user.discordToken = sealTok(accessToken);
      user.isDiscordAccount = true;
      await user.save();
      await redis.del(redisKeys.oauth.link(linkKey));
      void writeAuditLog(req, AuditAction.OAUTH_CONNECTED, {
        actorId: String(user._id),
        metadata: { provider: 'discord' },
      });
      return passportShape('discord', user);
    }
    default:
      throw new Error('Unknown provider');
  }
}

async function handleLogin(
  provider: OAuthProviderKey,
  accessToken: string,
  n: NormalizedOAuthProfile
): Promise<OAuthPassportUser> {
  const label = PROVIDER_LABEL[provider];
  switch (provider) {
    case 'google': {
      const existingUser = await UserModel.findOne({ googleId: n.providerId }).select('+googleToken');
      if (!existingUser || !existingUser.isGoogleAccount) {
        throw new Error(
          `No account is linked to this ${label}. Please sign up or link ${label} from settings.`
        );
      }
      existingUser.googleToken = sealTok(accessToken);
      await existingUser.save();
      return passportShape('google', existingUser);
    }
    case 'github': {
      const existingUser = await UserModel.findOne({ gitId: n.providerId }).select('+githubToken');
      if (!existingUser || !existingUser.isGitAccount) {
        throw new Error(
          `No account is linked to this ${label}. Please sign up or link ${label} from settings.`
        );
      }
      existingUser.githubToken = sealTok(accessToken);
      await existingUser.save();
      return passportShape('github', existingUser);
    }
    case 'facebook': {
      const existingUser = await UserModel.findOne({ facebookId: n.providerId }).select('+facebookToken');
      if (!existingUser || !existingUser.isFacebookAccount) {
        throw new Error(
          `No account is linked to this ${label}. Please sign up or link ${label} from settings.`
        );
      }
      existingUser.facebookToken = sealTok(accessToken);
      await existingUser.save();
      return passportShape('facebook', existingUser);
    }
    case 'x': {
      const existingUser = await UserModel.findOne({ xId: n.providerId }).select('+xToken');
      if (!existingUser || !existingUser.isXAccount) {
        throw new Error(
          `No account is linked to this ${label}. Please sign up or link ${label} from settings.`
        );
      }
      existingUser.xToken = sealTok(accessToken);
      await existingUser.save();
      return passportShape('x', existingUser);
    }
    case 'discord': {
      const existingUser = await UserModel.findOne({ discordId: n.providerId }).select('+discordToken');
      if (!existingUser || !existingUser.isDiscordAccount) {
        throw new Error(
          `No account is linked to this ${label}. Please sign up or link ${label} from settings.`
        );
      }
      existingUser.discordToken = sealTok(accessToken);
      await existingUser.save();
      return passportShape('discord', existingUser);
    }
    default:
      throw new Error('Unknown provider');
  }
}

async function handleSignup(provider: OAuthProviderKey, accessToken: string, n: NormalizedOAuthProfile): Promise<OAuthPassportUser> {
  const label = PROVIDER_LABEL[provider];
  /** Same lookup as legacy Passport flows (X uses placeholder email string before synthetic storage). */
  const existingByEmail = await UserModel.findOne({ email: n.email });
  if (existingByEmail) {
    throw new Error(
      `An account with this email already exists. Please sign in, then link ${label} from settings.`
    );
  }

  const doc = newUserBaseDoc(provider, n, accessToken);
  const newUser = new UserModel(doc);
  await newUser.save();
  await attachFreeSubscription(newUser._id);
  return passportShape(provider, newUser);
}

/**
 * Central OAuth business logic: link, login, or signup from a normalized provider profile.
 */
export async function handleOAuthProviderAuth(input: HandleOAuthInput): Promise<OAuthPassportUser> {
  const { provider, flow, accessToken, normalized, req } = input;

  if (flow.startsWith('link:')) {
    return handleLink(req, provider, flow.slice(5), accessToken, normalized);
  }
  if (flow === 'login') {
    return handleLogin(provider, accessToken, normalized);
  }
  // signup (or any non-login state treated as signup, matching prior Passport behavior)
  return handleSignup(provider, accessToken, normalized);
}
