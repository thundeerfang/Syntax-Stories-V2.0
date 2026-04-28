/**
 * Profile section shapes used when diffing for audit and loading current state before update.
 */
export type ProfileSections = {
    education?: unknown[];
    workExperiences?: unknown[];
    projects?: unknown[];
    certifications?: unknown[];
    openSourceContributions?: unknown[];
    stackAndTools?: string[];
    mySetup?: unknown[];
};
/** URL segment for `PATCH /auth/profile/:section` (see `registerAuthModuleRoutes`). */
export type ProfileUpdateSection = 'basic' | 'social' | 'stack' | 'work' | 'education' | 'certifications' | 'projects' | 'setup';
export declare const PROFILE_UPDATE_SECTIONS: readonly ["basic", "social", "stack", "work", "education", "certifications", "projects", "setup"];
export declare function isProfileUpdateSection(s: string): s is ProfileUpdateSection;
/** Keys allowed per section endpoint (subset of legacy `PATCH /auth/profile`). */
export declare const PROFILE_SECTION_KEYS: Record<ProfileUpdateSection, readonly string[]>;
export declare const ProfileErrorCode: {
    readonly USERNAME_TAKEN: "USERNAME_TAKEN";
    readonly NO_VALID_FIELDS: "NO_VALID_FIELDS";
    readonly USER_NOT_FOUND: "USER_NOT_FOUND";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    /** Client `expectedProfileVersion` does not match server (multi-tab / stale write). */
    readonly PROFILE_VERSION_CONFLICT: "PROFILE_VERSION_CONFLICT";
};
//# sourceMappingURL=profile.types.d.ts.map