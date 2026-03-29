import { normalizeProfileImg } from '../../models/User';

/**
 * Account-owner projection: `GET /auth/me`, `PATCH /auth/profile*`.
 * Always map DB lean docs through this (or `toPublicProfile`) before JSON — avoid returning raw models.
 */
export function mapUserDocumentToApiUser(found: Record<string, unknown>): Record<string, unknown> {
  const f = found as { createdAt?: Date };
  return {
    _id: found._id,
    fullName: found.fullName,
    username: found.username,
    email: found.email,
    profileImg: normalizeProfileImg(found.profileImg as string | undefined),
    coverBanner: found.coverBanner,
    bio: found.bio,
    job: found.job,
    portfolioUrl: found.portfolioUrl,
    linkedin: found.linkedin,
    instagram: found.instagram,
    github: found.github,
    youtube: found.youtube,
    stackAndTools: found.stackAndTools,
    workExperiences: found.workExperiences,
    education: found.education,
    certifications: found.certifications,
    projects: found.projects,
    openSourceContributions: found.openSourceContributions,
    mySetup: found.mySetup,
    isGoogleAccount: found.isGoogleAccount,
    isGitAccount: found.isGitAccount,
    isFacebookAccount: found.isFacebookAccount,
    isXAccount: found.isXAccount,
    isAppleAccount: found.isAppleAccount,
    isDiscordAccount: (found as { isDiscordAccount?: boolean }).isDiscordAccount ?? false,
    twoFactorEnabled: found.twoFactorEnabled,
    createdAt: f.createdAt,
  };
}

/** Alias for account responses (settings / session user). */
export const toAccountUser = mapUserDocumentToApiUser;

/**
 * Public profile by username: same field pick as account for now; omit or redact here when a dedicated public route uses this mapper.
 */
export function toPublicProfile(found: Record<string, unknown>): Record<string, unknown> {
  const account = { ...mapUserDocumentToApiUser(found) } as Record<string, unknown>;
  delete account.email;
  return account;
}
