import { DEFAULT_AVATAR_URL } from '../models/User.js';
import type { NormalizedOAuthProfile } from './oauth.types.js';

type GoogleLikeProfile = {
  id: string;
  displayName?: string;
  emails?: Array<{ value?: string }>;
  photos?: Array<{ value?: string }>;
};

export function normalizeGoogleProfile(profile: GoogleLikeProfile): NormalizedOAuthProfile {
  const email = profile.emails?.[0]?.value?.trim();
  if (!email) {
    throw new Error('Email not provided by Google');
  }
  const photoUrl = profile.photos?.[0]?.value;
  const profileImg =
    typeof photoUrl === 'string' && photoUrl.startsWith('http') ? photoUrl : DEFAULT_AVATAR_URL;
  return {
    providerId: profile.id,
    email,
    fullName: profile.displayName?.trim() || 'User',
    profileImg,
  };
}

type GitHubLikeProfile = {
  id: string | number;
  _json?: { email?: string; name?: string; avatar_url?: string };
  emails?: Array<{ value: string; primary?: boolean }>;
  displayName?: string;
  username?: string;
};

export function normalizeGithubProfile(profile: GitHubLikeProfile): NormalizedOAuthProfile {
  const email =
    profile._json?.email?.trim() ?? profile.emails?.find((e) => e.primary)?.value?.trim();
  if (!email) {
    throw new Error('Email is required but not available from GitHub');
  }
  const avatarUrl = profile._json?.avatar_url;
  const profileImg =
    typeof avatarUrl === 'string' && avatarUrl.startsWith('http') ? avatarUrl : DEFAULT_AVATAR_URL;
  const username = profile.username ?? 'user';
  return {
    providerId: String(profile.id),
    email,
    fullName: (profile._json?.name ?? profile.displayName ?? username)?.trim() || 'User',
    profileImg,
    githubUrl: `https://github.com/${username}`,
    githubUsername: username,
  };
}

type FacebookLikeProfile = {
  id: string;
  displayName?: string;
  emails?: Array<{ value?: string }>;
  photos?: Array<{ value?: string }>;
};

export function normalizeFacebookProfile(profile: FacebookLikeProfile): NormalizedOAuthProfile {
  const email = profile.emails?.[0]?.value?.trim();
  if (!email) {
    throw new Error('Email not available from Facebook');
  }
  const photoVal = profile.photos?.[0]?.value;
  const profileImg =
    typeof photoVal === 'string' && photoVal.startsWith('http') ? photoVal : DEFAULT_AVATAR_URL;
  return {
    providerId: profile.id,
    email,
    fullName: profile.displayName?.trim() || 'User',
    profileImg,
  };
}

type XLikeProfile = {
  id: string;
  displayName?: string;
  username?: string;
  emails?: Array<{ value?: string }>;
  photos?: Array<{ value?: string }>;
};

export function normalizeXProfile(profile: XLikeProfile): NormalizedOAuthProfile {
  const realEmail = profile.emails?.[0]?.value?.trim();
  const fallbackEmail = `${profile.username ?? 'user'}@twitter.placeholder`;
  const email = realEmail ?? fallbackEmail;
  const useXSyntheticEmail = !realEmail || email.includes('@twitter.placeholder');
  const photoVal = profile.photos?.[0]?.value;
  const profileImg =
    typeof photoVal === 'string' && photoVal.startsWith('http') ? photoVal : DEFAULT_AVATAR_URL;
  return {
    providerId: profile.id,
    email,
    fullName: profile.displayName?.trim() || profile.username?.trim() || 'User',
    profileImg,
    xHandle: (profile.username ?? 'user').toLowerCase(),
    useXSyntheticEmail,
  };
}

const DISCORD_API = 'https://discord.com/api';

/** Discord `/users/@me` payload (passport-oauth2 userProfile). */
export type DiscordMeProfile = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
};

export async function fetchDiscordMe(accessToken: string): Promise<DiscordMeProfile> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord profile failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<DiscordMeProfile>;
}

function discordAvatarUrl(user: DiscordMeProfile): string {
  if (!user.avatar) return DEFAULT_AVATAR_URL;
  const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
}

export function normalizeDiscordProfile(discordUser: DiscordMeProfile): NormalizedOAuthProfile {
  const email = discordUser.email?.trim()?.toLowerCase();
  if (!email) {
    throw new Error(
      'Discord did not return an email. Enable email on your Discord account or allow email scope.'
    );
  }
  const baseUsername =
    (discordUser.username || 'user').replaceAll(/\W/g, '').slice(0, 20) || 'user';
  const fullName = (discordUser.global_name ?? discordUser.username ?? 'User').trim() || 'User';
  return {
    providerId: discordUser.id,
    email,
    fullName,
    profileImg: discordAvatarUrl(discordUser),
    discordUsernameBase: baseUsername,
  };
}
