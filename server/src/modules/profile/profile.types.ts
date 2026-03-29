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
export type ProfileUpdateSection =
  | 'basic'
  | 'social'
  | 'work'
  | 'education'
  | 'certifications'
  | 'projects'
  | 'setup';

export const PROFILE_UPDATE_SECTIONS = [
  'basic',
  'social',
  'work',
  'education',
  'certifications',
  'projects',
  'setup',
] as const satisfies readonly ProfileUpdateSection[];

export function isProfileUpdateSection(s: string): s is ProfileUpdateSection {
  return (PROFILE_UPDATE_SECTIONS as readonly string[]).includes(s);
}

/** Keys allowed per section endpoint (subset of legacy `PATCH /auth/profile`). */
export const PROFILE_SECTION_KEYS: Record<ProfileUpdateSection, readonly string[]> = {
  basic: [
    'fullName',
    'username',
    'bio',
    'profileImg',
    'coverBanner',
    'job',
    'portfolioUrl',
    'stackAndTools',
    'isGoogleAccount',
    'isGitAccount',
    'isFacebookAccount',
    'isXAccount',
    'isAppleAccount',
    'isDiscordAccount',
  ],
  social: ['linkedin', 'instagram', 'github', 'youtube'],
  work: ['workExperiences'],
  education: ['education'],
  certifications: ['certifications'],
  projects: ['projects', 'openSourceContributions'],
  setup: ['mySetup'],
};

export const ProfileErrorCode = {
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  NO_VALID_FIELDS: 'NO_VALID_FIELDS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
