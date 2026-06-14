import type { Request } from "express";
export type OAuthProviderKey =
  | "google"
  | "github"
  | "facebook"
  | "x"
  | "discord"
  | "twitch";
export type OAuthPassportUser = {
  _id: unknown;
  googleId?: string;
  gitId?: string;
  facebookId?: string;
  xId?: string;
  discordId?: string;
  twitchId?: string;
};
export type NormalizedOAuthProfile = {
  providerId: string;
  email: string;
  fullName: string;
  profileImg: string;
  githubUrl?: string;
  githubUsername?: string;
  discordUsernameBase?: string;
  twitchUsernameBase?: string;
  xHandle?: string;
  useXSyntheticEmail?: boolean;
};
export type HandleOAuthInput = {
  provider: OAuthProviderKey;
  flow: string;
  accessToken: string;
  normalized: NormalizedOAuthProfile;
  req: Request;
};
