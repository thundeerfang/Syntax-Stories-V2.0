import type { IUser } from "../../models/User.js";
const USER_LIST_FIELDS =
  "fullName username email isActive emailVerified lastLoginAt profileImg subscriptionStatus subscriptionPlanKey subscriptionPeriodEnd staffRole createdAt job profileLocation twoFactorEnabled";
export { USER_LIST_FIELDS };
export type UserListRow = {
  _id: {
    toString(): string;
  };
  fullName: string;
  username: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  profileImg?: string;
  subscriptionStatus?: string;
  subscriptionPlanKey?: string;
  subscriptionPeriodEnd?: Date;
  staffRole?: string;
  createdAt: Date;
  job?: string;
  profileLocation?: string;
  twoFactorEnabled?: boolean;
};
export function accountTypeFromStaffRole(
  staffRole?: string | null,
): "platform" | "staff" {
  return staffRole?.trim() ? "staff" : "platform";
}
export function toUserListDto(
  u: UserListRow,
  encodeRef: (id: string) => string,
) {
  const id = String(u._id);
  return {
    id,
    ref: encodeRef(id),
    fullName: u.fullName,
    username: u.username,
    email: u.email,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    profileImg: u.profileImg ?? null,
    subscriptionStatus: u.subscriptionStatus ?? null,
    subscriptionPlanKey: u.subscriptionPlanKey ?? null,
    subscriptionPeriodEnd: u.subscriptionPeriodEnd?.toISOString() ?? null,
    staffRole: u.staffRole ?? null,
    accountType: accountTypeFromStaffRole(u.staffRole),
    job: u.job?.trim() || null,
    profileLocation: u.profileLocation?.trim() || null,
    twoFactorEnabled: Boolean(u.twoFactorEnabled),
    createdAt: u.createdAt.toISOString(),
  };
}
function iso(d: Date | undefined | null): string | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}
export function toUserProfileDto(
  user: IUser & {
    _id: {
      toString(): string;
    };
    workExperiences?: unknown[];
    education?: unknown[];
  },
) {
  return {
    profileImg: user.profileImg ?? null,
    profileImgAlt: user.profileImgAlt?.trim() || null,
    coverBanner: user.coverBanner ?? null,
    coverBannerAlt: user.coverBannerAlt?.trim() || null,
    gender: user.gender?.trim() || null,
    job: user.job?.trim() || null,
    profileLocation: user.profileLocation?.trim() || null,
    bio: user.bio?.trim() || null,
    portfolioUrl: user.portfolioUrl?.trim() || null,
    linkedin: user.linkedin?.trim() || null,
    instagram: user.instagram?.trim() || null,
    github: user.github?.trim() || null,
    youtube: user.youtube?.trim() || null,
    stackAndTools: user.stackAndTools ?? [],
    workExperiences: user.workExperiences ?? [],
    education: user.education ?? [],
    certifications: user.certifications ?? [],
    projects: user.projects ?? [],
    openSourceContributions: user.openSourceContributions ?? [],
    mySetup: user.mySetup ?? [],
    blogStreakMode: user.blogStreakMode ?? "daily",
    profileUpdatedAt: iso(user.profileUpdatedAt),
    referralCode: user.referralCode?.trim() || null,
    referralSource: user.referralSource?.trim() || null,
    referredAt: iso(user.referredAt),
    blogRespectReceivedCount: user.blogRespectReceivedCount ?? 0,
    readStreakLongest: user.readStreakLongest ?? 0,
  };
}
export function toUserOAuthDto(user: IUser) {
  return {
    isGoogleAccount: Boolean(user.isGoogleAccount),
    isGitAccount: Boolean(user.isGitAccount),
    isFacebookAccount: Boolean(user.isFacebookAccount),
    isXAccount: Boolean(user.isXAccount),
    isAppleAccount: Boolean(user.isAppleAccount),
    isDiscordAccount: Boolean(user.isDiscordAccount),
    isTwitchAccount: Boolean(user.isTwitchAccount),
  };
}
