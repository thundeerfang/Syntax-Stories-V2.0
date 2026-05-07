import mongoose, { Document, Model } from 'mongoose';
/** Default avatar URL stored in DB when user has no profile image (e.g. OAuth signup without photo). */
export declare const DEFAULT_AVATAR_URL = "https://res.cloudinary.com/dr2bxpjjz/image/upload/v1737041910/uploads/waumti9zvnnmgayfxbmv.png";
/** Returns DEFAULT_AVATAR_URL when profileImg is missing or a relative/broken path (e.g. old OAuth placeholder). */
export declare function normalizeProfileImg(profileImg: string | undefined): string;
export interface IWorkExperience {
    /** Auto-generated when added; used for WORK_ID display (e.g. "1", "2"). */
    workId?: string;
    jobTitle: string;
    employmentType?: string;
    company: string;
    companyDomain?: string;
    companyLogo?: string;
    /** Optional HTML title + img alt for company logo. */
    companyLogoAlt?: string;
    currentPosition?: boolean;
    startDate?: string;
    endDate?: string;
    location?: string;
    locationType?: string;
    description?: string;
    skills?: string[];
    /** Promoted-to roles at the same company (timeline: initial role then promotion 1, 2, 3...). */
    promotions?: Array<{
        jobTitle: string;
        startDate?: string;
        endDate?: string;
        currentPosition?: boolean;
        media?: IWorkExperienceMediaItem[];
    }>;
    /** @deprecated use media */
    mediaUrls?: string[];
    /** Media items: links or uploaded images (url, title) */
    media?: IWorkExperienceMediaItem[];
}
export interface IWorkExperienceMediaItem {
    url: string;
    title?: string;
}
export interface IEducation {
    /** Auto-generated per education entry, used for EDU_ID display (e.g. "1", "2"). */
    eduId?: string;
    school: string;
    schoolDomain?: string;
    schoolLogo?: string;
    /** Optional HTML title + img alt for school logo. */
    schoolLogoAlt?: string;
    degree: string;
    fieldOfStudy?: string;
    currentEducation?: boolean;
    startDate?: string;
    endDate?: string;
    grade?: string;
    description?: string;
    activity?: string;
    /** Ref code like "2024_EDU_DOC", based on last update year. */
    refCode?: string;
}
export interface ICertificationMediaItem {
    url: string;
    title?: string;
}
export interface ICertification {
    /** Auto-generated per certification, used for CERT_ID display (e.g. "1", "2"). */
    certId?: string;
    name: string;
    issuingOrganization: string;
    issuerLogo?: string;
    /** Optional HTML title + img alt for issuer logo. */
    issuerLogoAlt?: string;
    currentlyValid?: boolean;
    issueDate?: string;
    expirationDate?: string;
    /** Auto-generated per certification, e.g. "A-24" based on year. */
    certValType?: string;
    credentialId?: string;
    credentialUrl?: string;
    description?: string;
    skills?: string[];
    media?: ICertificationMediaItem[];
}
export interface IProject {
    type?: 'project' | 'publication';
    /** When imported from GitHub repo picker */
    source?: 'github';
    /** owner/repo */
    repoFullName?: string;
    repoId?: number;
    title: string;
    publisher?: string;
    ongoing?: boolean;
    publicationDate?: string;
    endDate?: string;
    publicationUrl?: string;
    description?: string;
    media?: {
        url: string;
        title?: string;
    }[];
    /** Last updated year log, e.g. "2025_prd_log", set by backend on profile update. */
    prjLog?: string;
}
export interface IOpenSourceContribution {
    title: string;
    repository?: string;
    repositoryUrl?: string;
    active?: boolean;
    activeFrom?: string;
    endDate?: string;
    description?: string;
}
export interface ISetupItem {
    label: string;
    imageUrl: string;
    productUrl?: string;
    /** Optional accessibility text for the image (HTML title + alt). */
    imageAlt?: string;
}
export interface IUser extends Document {
    fullName: string;
    username: string;
    email: string;
    profileImg?: string;
    /** Optional; used as HTML title + img alt for profile photo. */
    profileImgAlt?: string;
    coverBanner?: string;
    /** Optional; used as HTML title + img alt for cover banner. */
    coverBannerAlt?: string;
    gender?: string;
    job?: string;
    bio?: string;
    portfolioUrl?: string;
    linkedin?: string;
    instagram?: string;
    github?: string;
    youtube?: string;
    stackAndTools?: string[];
    workExperiences?: IWorkExperience[];
    education?: IEducation[];
    certifications?: ICertification[];
    projects?: IProject[];
    openSourceContributions?: IOpenSourceContribution[];
    mySetup?: ISetupItem[];
    isGoogleAccount: boolean;
    isGitAccount: boolean;
    isFacebookAccount: boolean;
    isXAccount: boolean;
    isAppleAccount: boolean;
    isDiscordAccount: boolean;
    googleId?: string;
    gitId?: string;
    facebookId?: string;
    appleId?: string;
    xId?: string;
    discordId?: string;
    googleToken?: string;
    githubToken?: string;
    facebookToken?: string;
    xToken?: string;
    appleToken?: string;
    discordToken?: string;
    isActive: boolean;
    emailVerified: boolean;
    lastLoginAt?: Date;
    subscription?: mongoose.Types.ObjectId;
    /** Stripe Customer id (`cus_...`); one per user when billing is set up. */
    stripeCustomerId?: string | null;
    /** Denormalized from Subscription / Stripe for fast reads. */
    subscriptionStatus?: string;
    subscriptionPlanKey?: string;
    subscriptionPeriodEnd?: Date;
    lastSubscriptionReconciledAt?: Date | null;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    /** Denormalized: updated on follow/unfollow */
    followersCount?: number;
    followingCount?: number;
    /** Incremented on each successful profile PATCH; used for optimistic concurrency (optional client `expectedProfileVersion`). */
    profileVersion?: number;
    profileUpdatedAt?: Date;
    /** Public invite code (opaque); unique when set. */
    referralCode?: string;
    /** User who referred this account (immutable once set). */
    referredByUserId?: mongoose.Types.ObjectId;
    referredAt?: Date;
    /** e.g. `link`, `blog`, `oauth` */
    referralSource?: string;
    referralCapturedAt?: Date;
    /** CMS / help admin access; unset = no staff UI. */
    staffRole?: 'editor' | 'admin';
    /** Bcrypt hash for `POST /auth/staff-login` (staff accounts only). Not selected by default. */
    staffPasswordHash?: string;
    /** Admin soft-delete (platform user directory); omit or null = active in directory. */
    deletedAt?: Date | null;
    deletedById?: mongoose.Types.ObjectId;
    /** Which blog posting streak granularity is shown on the public profile (`daily` default). */
    blogStreakMode?: 'daily' | 'weekly' | 'monthly';
    /** Durable max daily read streak length from Mongo recompute (F.5); merged into public `readStreak`. */
    readStreakLongest?: number;
    /** Denormalized: total Respect received on published, non-deleted blog posts (see blog Respect spec). */
    blogRespectReceivedCount?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const UserModel: Model<IUser>;
//# sourceMappingURL=User.d.ts.map