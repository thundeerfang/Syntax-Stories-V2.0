import type { Request } from 'express';

export type OAuthProviderKey = 'google' | 'github' | 'facebook' | 'x' | 'discord';

/** Shape passed to `oauthCallbackHandler` / Passport `done(null, user)`. */
export type OAuthPassportUser = {
  _id: unknown;
  googleId?: string;
  gitId?: string;
  facebookId?: string;
  xId?: string;
  discordId?: string;
};

/**
 * Provider-agnostic profile after normalization (Week 2).
 * Used by `handleOAuthProviderAuth` for link / login / signup.
 */
export type NormalizedOAuthProfile = {
  providerId: string;
  email: string;
  fullName: string;
  profileImg: string;
  githubUrl?: string;
  /** GitHub `username` for signup username suffix */
  githubUsername?: string;
  /** Discord: sanitized base for username before random suffix */
  discordUsernameBase?: string;
  /** X/Twitter handle for signup username */
  xHandle?: string;
  /** When true, signup stores `x-{id}@syntaxstories.placeholder` instead of `email` */
  useXSyntheticEmail?: boolean;
};

export type HandleOAuthInput = {
  provider: OAuthProviderKey;
  flow: string;
  accessToken: string;
  normalized: NormalizedOAuthProfile;
  req: Request;
};
