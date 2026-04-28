export const PROFILE_UPDATE_SECTIONS = [
    'basic',
    'social',
    'stack',
    'work',
    'education',
    'certifications',
    'projects',
    'setup',
];
export function isProfileUpdateSection(s) {
    return PROFILE_UPDATE_SECTIONS.includes(s);
}
/** Keys allowed per section endpoint (subset of legacy `PATCH /auth/profile`). */
export const PROFILE_SECTION_KEYS = {
    basic: [
        'fullName',
        'username',
        'bio',
        'profileImg',
        'coverBanner',
        'job',
        'portfolioUrl',
        'isGoogleAccount',
        'isGitAccount',
        'isFacebookAccount',
        'isXAccount',
        'isAppleAccount',
        'isDiscordAccount',
    ],
    social: ['linkedin', 'instagram', 'github', 'youtube'],
    stack: ['stackAndTools'],
    work: ['workExperiences'],
    education: ['education'],
    certifications: ['certifications'],
    projects: ['projects', 'openSourceContributions', 'isGitAccount'],
    setup: ['mySetup'],
};
export const ProfileErrorCode = {
    USERNAME_TAKEN: 'USERNAME_TAKEN',
    NO_VALID_FIELDS: 'NO_VALID_FIELDS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    /** Client `expectedProfileVersion` does not match server (multi-tab / stale write). */
    PROFILE_VERSION_CONFLICT: 'PROFILE_VERSION_CONFLICT',
};
//# sourceMappingURL=profile.types.js.map