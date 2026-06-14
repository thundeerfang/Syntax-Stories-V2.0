export type ProfileSections = {
  projects?: unknown[];
  certifications?: unknown[];
  openSourceContributions?: unknown[];
  stackAndTools?: string[];
  mySetup?: unknown[];
};
export type ProfileUpdateSection =
  | "basic"
  | "social"
  | "stack"
  | "certifications"
  | "projects"
  | "setup"
  | "blog-streak";
export const PROFILE_UPDATE_SECTIONS = [
  "basic",
  "social",
  "stack",
  "certifications",
  "projects",
  "setup",
  "blog-streak",
] as const satisfies readonly ProfileUpdateSection[];
export function isProfileUpdateSection(s: string): s is ProfileUpdateSection {
  return (PROFILE_UPDATE_SECTIONS as readonly string[]).includes(s);
}
export const PROFILE_SECTION_KEYS: Record<
  ProfileUpdateSection,
  readonly string[]
> = {
  basic: [
    "fullName",
    "username",
    "bio",
    "profileImg",
    "profileImgAlt",
    "coverBanner",
    "coverBannerAlt",
    "job",
    "profileLocation",
    "portfolioUrl",
    "isGoogleAccount",
    "isGitAccount",
    "isFacebookAccount",
    "isXAccount",
    "isAppleAccount",
    "isDiscordAccount",
  ],
  social: ["linkedin", "instagram", "github", "youtube"],
  stack: ["stackAndTools"],
  certifications: ["certifications"],
  projects: ["projects", "openSourceContributions", "isGitAccount"],
  setup: ["mySetup"],
  "blog-streak": ["blogStreakMode"],
};
export const ProfileErrorCode = {
  USERNAME_TAKEN: "USERNAME_TAKEN",
  NO_VALID_FIELDS: "NO_VALID_FIELDS",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  PROFILE_VERSION_CONFLICT: "PROFILE_VERSION_CONFLICT",
} as const;
