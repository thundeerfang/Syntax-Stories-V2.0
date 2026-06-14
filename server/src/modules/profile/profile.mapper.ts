import { normalizeProfileImg } from "../../models/User.js";
import { normalizeProfileBio } from "../../utils/profileBio.js";
export function mapUserDocumentToApiUser(
  found: Record<string, unknown>,
): Record<string, unknown> {
  const f = found as {
    createdAt?: Date;
  };
  return {
    _id: found._id,
    fullName: found.fullName,
    username: found.username,
    email: found.email,
    profileImg: normalizeProfileImg(found.profileImg as string | undefined),
    profileImgAlt: found.profileImgAlt,
    coverBanner: found.coverBanner,
    coverBannerAlt: found.coverBannerAlt,
    bio: normalizeProfileBio(found.bio),
    job: found.job,
    portfolioUrl: found.portfolioUrl,
    linkedin: found.linkedin,
    instagram: found.instagram,
    github: found.github,
    youtube: found.youtube,
    stackAndTools: found.stackAndTools,
    certifications: found.certifications,
    projects: found.projects,
    openSourceContributions: found.openSourceContributions,
    mySetup: found.mySetup,
    isGoogleAccount: found.isGoogleAccount,
    isGitAccount: found.isGitAccount,
    isFacebookAccount: found.isFacebookAccount,
    isXAccount: found.isXAccount,
    isAppleAccount: found.isAppleAccount,
    isDiscordAccount:
      (
        found as {
          isDiscordAccount?: boolean;
        }
      ).isDiscordAccount ?? false,
    twoFactorEnabled: found.twoFactorEnabled,
    createdAt: f.createdAt,
    profileVersion:
      typeof found.profileVersion === "number" ? found.profileVersion : 0,
    profileUpdatedAt:
      found.profileUpdatedAt instanceof Date
        ? found.profileUpdatedAt.toISOString()
        : typeof found.profileUpdatedAt === "string"
          ? found.profileUpdatedAt
          : undefined,
    staffRole:
      (
        found as {
          staffRole?: string;
        }
      ).staffRole ?? null,
    blogStreakMode:
      (
        found as {
          blogStreakMode?: string;
        }
      ).blogStreakMode ?? "daily",
  };
}
export const toAccountUser = mapUserDocumentToApiUser;
export function toPublicProfile(
  found: Record<string, unknown>,
): Record<string, unknown> {
  const account = { ...mapUserDocumentToApiUser(found) } as Record<
    string,
    unknown
  >;
  delete account.email;
  return account;
}
