import { normalizeProfileImg } from '../../models/User.js';
/**
 * Account-owner projection: `GET /auth/me`, `PATCH /auth/profile*`.
 * Always map DB lean docs through this (or `toPublicProfile`) before JSON — avoid returning raw models.
 */
export function mapUserDocumentToApiUser(found) {
    const f = found;
    return {
        _id: found._id,
        fullName: found.fullName,
        username: found.username,
        email: found.email,
        profileImg: normalizeProfileImg(found.profileImg),
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
        isDiscordAccount: found.isDiscordAccount ?? false,
        twoFactorEnabled: found.twoFactorEnabled,
        createdAt: f.createdAt,
        profileVersion: typeof found.profileVersion === 'number' ? found.profileVersion : 0,
        profileUpdatedAt: found.profileUpdatedAt instanceof Date
            ? found.profileUpdatedAt.toISOString()
            : typeof found.profileUpdatedAt === 'string'
                ? found.profileUpdatedAt
                : undefined,
    };
}
/** Alias for account responses (settings / session user). */
export const toAccountUser = mapUserDocumentToApiUser;
/**
 * Public profile by username: same field pick as account for now; omit or redact here when a dedicated public route uses this mapper.
 */
export function toPublicProfile(found) {
    const account = { ...mapUserDocumentToApiUser(found) };
    delete account.email;
    return account;
}
//# sourceMappingURL=profile.mapper.js.map