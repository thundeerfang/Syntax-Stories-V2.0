import mongoose, { Schema, Document, Model } from 'mongoose';
import { BIO_MAX_LENGTH, DEFAULT_AVATAR_SEED } from '../variable/constants.js';
import { diceBearAvatarSvgUrl } from '../utils/diceBearAvatarUrl.js';
import { ensureOpaqueDiceBearDataUri } from '../utils/diceBearSvgBackground.js';

/** Fallback when `profileImg` is empty or invalid (DiceBear Adventurer SVG data URI, deterministic). */
export const DEFAULT_AVATAR_URL = diceBearAvatarSvgUrl(DEFAULT_AVATAR_SEED);

/** Returns DEFAULT_AVATAR_URL when profileImg is missing or a relative/broken path (e.g. old OAuth placeholder). */
export function normalizeProfileImg(profileImg: string | undefined): string {
  if (!profileImg?.trim()) return DEFAULT_AVATAR_URL;
  if (profileImg.startsWith('http://') || profileImg.startsWith('https://')) return profileImg;
  if (profileImg.startsWith('data:image/svg+xml')) {
    return ensureOpaqueDiceBearDataUri(profileImg);
  }
  if (profileImg.startsWith('data:image/')) return profileImg;
  return DEFAULT_AVATAR_URL;
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
  media?: { url: string; title?: string }[];
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

export interface IUserPasskey {
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceLabel: string;
  createdAt: Date;
  lastUsedAt?: Date;
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
  /** Public profile location (city/region display). */
  profileLocation?: string;
  bio?: string;
  portfolioUrl?: string;
  linkedin?: string;
  instagram?: string;
  github?: string;
  youtube?: string;
  stackAndTools?: string[];
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
  isTwitchAccount: boolean;
  googleId?: string;
  gitId?: string;
  facebookId?: string;
  appleId?: string;
  xId?: string;
  discordId?: string;
  twitchId?: string;
  googleToken?: string;
  githubToken?: string;
  facebookToken?: string;
  xToken?: string;
  appleToken?: string;
  discordToken?: string;
  twitchToken?: string;
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
  /** Platform passkeys (Touch ID / Windows Hello) for admin step-up. */
  passkeys?: IUserPasskey[];
  /** When true and passkeys exist, step-up may use biometrics instead of TOTP only. */
  passkeyStepUpEnabled?: boolean;
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

const CertificationSchema = new Schema(
  {
    certId: { type: String, trim: true, maxlength: 20 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    issuingOrganization: { type: String, required: true, trim: true, maxlength: 120 },
    issuerLogo: { type: String, trim: true, maxlength: 2000 },
    issuerLogoAlt: { type: String, trim: true, maxlength: 120 },
    currentlyValid: { type: Boolean, default: false },
    issueDate: { type: String, trim: true, maxlength: 20 },
    expirationDate: { type: String, trim: true, maxlength: 20 },
    certValType: { type: String, trim: true, maxlength: 20 },
    credentialId: { type: String, trim: true, maxlength: 80 },
    credentialUrl: { type: String, trim: true, maxlength: 500 },
    description: { type: String, trim: true, maxlength: 2000 },
    skills: { type: [String], default: [], maxlength: 30 },
    media: {
      type: [
        {
          url: { type: String, required: true, trim: true, maxlength: 500 },
          title: { type: String, trim: true, maxlength: 120 },
        },
      ],
      default: [],
      maxlength: 5,
      _id: false,
    },
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    type: { type: String, enum: ['project', 'publication'], default: 'project', trim: true },
    source: { type: String, enum: ['github'], trim: true },
    repoFullName: { type: String, trim: true, maxlength: 200 },
    repoId: { type: Number },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    publisher: { type: String, trim: true, maxlength: 120 },
    ongoing: { type: Boolean, default: false },
    publicationDate: { type: String, trim: true, maxlength: 20 },
    endDate: { type: String, trim: true, maxlength: 20 },
    publicationUrl: { type: String, trim: true, maxlength: 500 },
    description: { type: String, trim: true, maxlength: 2000 },
    prjLog: { type: String, trim: true, maxlength: 20 },
    media: {
      type: [
        {
          url: { type: String, required: true, trim: true, maxlength: 500 },
          title: { type: String, trim: true, maxlength: 120 },
        },
      ],
      default: [],
      maxlength: 5,
      _id: false,
    },
  },
  { _id: false }
);

const OpenSourceContributionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    repository: { type: String, trim: true, maxlength: 200 },
    repositoryUrl: { type: String, trim: true, maxlength: 500 },
    active: { type: Boolean, default: false },
    activeFrom: { type: String, trim: true, maxlength: 20 },
    endDate: { type: String, trim: true, maxlength: 20 },
    description: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false }
);

const SetupItemSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    imageUrl: { type: String, required: true, trim: true, maxlength: 500 },
    productUrl: { type: String, trim: true, maxlength: 500 },
    imageAlt: { type: String, trim: true, maxlength: 120 },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    profileImg: {
      type: String,
      maxlength: 131072,
      default: DEFAULT_AVATAR_URL,
    },
    profileImgAlt: { type: String, trim: true, maxlength: 120 },
    coverBanner: { type: String },
    coverBannerAlt: { type: String, trim: true, maxlength: 120 },
    gender: { type: String },
    job: { type: String },
    profileLocation: { type: String, trim: true, maxlength: 180 },
    bio: {
      type: String,
      trim: true,
      maxlength: BIO_MAX_LENGTH,
    },
    portfolioUrl: { type: String, trim: true, maxlength: 500 },
    linkedin: { type: String },
    instagram: { type: String },
    github: { type: String },
    youtube: { type: String },
    stackAndTools: {
      type: [String],
      default: [],
      validate: {
        validator(v: unknown) {
          return Array.isArray(v) && v.length <= 10;
        },
        message: 'Stack & Tools cannot exceed 10 items.',
      },
    },
    certifications: { type: [CertificationSchema], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    openSourceContributions: { type: [OpenSourceContributionSchema], default: [] },
    mySetup: { type: [SetupItemSchema], default: [], maxlength: 5 },
    isGoogleAccount: { type: Boolean, default: false },
    isGitAccount: { type: Boolean, default: false },
    isFacebookAccount: { type: Boolean, default: false },
    isXAccount: { type: Boolean, default: false },
    isAppleAccount: { type: Boolean, default: false },
    isDiscordAccount: { type: Boolean, default: false },
    isTwitchAccount: { type: Boolean, default: false },
    googleId: { type: String, sparse: true },
    gitId: { type: String, sparse: true },
    facebookId: { type: String, sparse: true },
    appleId: { type: String, sparse: true },
    xId: { type: String, sparse: true },
    discordId: { type: String, sparse: true },
    twitchId: { type: String, sparse: true },
    googleToken: { type: String, select: false },
    githubToken: { type: String, select: false },
    facebookToken: { type: String, select: false },
    xToken: { type: String, select: false },
    appleToken: { type: String, select: false },
    discordToken: { type: String, select: false },
    twitchToken: { type: String, select: false },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    subscription: { type: Schema.Types.ObjectId, ref: 'subscriptions', default: null },
    stripeCustomerId: { type: String, sparse: true, unique: true, trim: true },
    subscriptionStatus: { type: String, trim: true, maxlength: 32 },
    subscriptionPlanKey: { type: String, trim: true, maxlength: 16 },
    subscriptionPeriodEnd: { type: Date },
    lastSubscriptionReconciledAt: { type: Date, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    passkeys: {
      type: [
        {
          credentialId: { type: String, required: true },
          publicKey: { type: String, required: true },
          counter: { type: Number, default: 0 },
          deviceLabel: { type: String, default: 'This device' },
          createdAt: { type: Date, default: Date.now },
          lastUsedAt: { type: Date },
        },
      ],
      default: [],
    },
    passkeyStepUpEnabled: { type: Boolean, default: false },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    profileVersion: { type: Number, default: 0, min: 0 },
    profileUpdatedAt: { type: Date },
    referralCode: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
      maxlength: 24,
    },
    referredByUserId: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    referredAt: { type: Date, default: null },
    referralSource: { type: String, trim: true, maxlength: 32, default: undefined },
    referralCapturedAt: { type: Date, default: null },
    staffRole: { type: String, enum: ['editor', 'admin'], required: false, select: true },
    staffPasswordHash: { type: String, select: false },
    deletedAt: { type: Date, default: null, index: true },
    deletedById: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    blogStreakMode: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
    readStreakLongest: { type: Number, min: 0 },
    blogRespectReceivedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

UserSchema.index({ referredByUserId: 1, createdAt: -1 });
UserSchema.index({ deletedAt: 1, createdAt: -1 });

export const UserModel: Model<IUser> =
  mongoose.models?.users ?? mongoose.model<IUser>('users', UserSchema);
