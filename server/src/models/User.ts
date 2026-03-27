import mongoose, { Schema, Document, Model } from 'mongoose';

/** Default avatar URL stored in DB when user has no profile image (e.g. OAuth signup without photo). */
export const DEFAULT_AVATAR_URL =
  'https://res.cloudinary.com/dr2bxpjjz/image/upload/v1737041910/uploads/waumti9zvnnmgayfxbmv.png';

/** Returns DEFAULT_AVATAR_URL when profileImg is missing or a relative/broken path (e.g. old OAuth placeholder). */
export function normalizeProfileImg(profileImg: string | undefined): string {
  if (!profileImg?.trim()) return DEFAULT_AVATAR_URL;
  if (profileImg.startsWith('http://') || profileImg.startsWith('https://')) return profileImg;
  return DEFAULT_AVATAR_URL;
}

export interface IWorkExperience {
  /** Auto-generated when added; used for WORK_ID display (e.g. "1", "2"). */
  workId?: string;
  jobTitle: string;
  employmentType?: string;
  company: string;
  companyDomain?: string;
  companyLogo?: string;
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
  /** Media items: links or uploaded images (url, title, altText) */
  media?: IWorkExperienceMediaItem[];
}

export interface IWorkExperienceMediaItem {
  url: string;
  title?: string;
  altText?: string;
}

export interface IEducation {
  /** Auto-generated per education entry, used for EDU_ID display (e.g. "1", "2"). */
  eduId?: string;
  school: string;
  schoolDomain?: string;
  schoolLogo?: string;
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
  altText?: string;
}

export interface ICertification {
  /** Auto-generated per certification, used for CERT_ID display (e.g. "1", "2"). */
  certId?: string;
  name: string;
  issuingOrganization: string;
  issuerLogo?: string;
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
  media?: { url: string; title?: string; altText?: string }[];
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
}

export interface IUser extends Document {
  fullName: string;
  username: string;
  email: string;
  profileImg?: string;
  coverBanner?: string;
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
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  /** Denormalized: updated on follow/unfollow */
  followersCount?: number;
  followingCount?: number;
}

const WorkExperienceSchema = new Schema({
  workId: { type: String, trim: true, maxlength: 20 },
  jobTitle: { type: String, required: true, trim: true, maxlength: 120 },
  employmentType: { type: String, trim: true, maxlength: 50 },
  company: { type: String, required: true, trim: true, maxlength: 200 },
  companyDomain: { type: String, trim: true, maxlength: 120 },
  companyLogo: { type: String, trim: true, maxlength: 500 },
  currentPosition: { type: Boolean, default: false },
  startDate: { type: String, trim: true, maxlength: 20 },
  endDate: { type: String, trim: true, maxlength: 20 },
  location: { type: String, trim: true, maxlength: 180 },
  locationType: { type: String, trim: true, maxlength: 20 },
  description: { type: String, trim: true, maxlength: 5000 },
  skills: { type: [String], default: [], maxlength: 10 },
  /** @deprecated use promotions array */
  promotion: {
    type: new Schema({
      jobTitle: { type: String, required: true, trim: true, maxlength: 120 },
      startDate: { type: String, trim: true, maxlength: 20 },
      endDate: { type: String, trim: true, maxlength: 20 },
      currentPosition: { type: Boolean, default: false },
    }, { _id: false }),
    default: undefined,
  },
  promotions: {
    type: [new Schema({
      jobTitle: { type: String, required: true, trim: true, maxlength: 120 },
      startDate: { type: String, trim: true, maxlength: 20 },
      endDate: { type: String, trim: true, maxlength: 20 },
      currentPosition: { type: Boolean, default: false },
      media: {
        type: [new Schema({ url: { type: String, required: true, trim: true, maxlength: 500 }, title: { type: String, trim: true, maxlength: 120 }, altText: { type: String, trim: true, maxlength: 200 } }, { _id: false })],
        default: undefined,
        maxlength: 5,
      },
    }, { _id: false })],
    default: undefined,
    maxlength: 5,
  },
  mediaUrls: { type: [String], default: [], maxlength: 5 },
  media: {
    type: [{
      url: { type: String, required: true, trim: true, maxlength: 500 },
      title: { type: String, trim: true, maxlength: 120 },
      altText: { type: String, trim: true, maxlength: 200 },
    }],
    default: [],
    maxlength: 5,
    _id: false,
  },
}, { _id: false });

const EducationSchema = new Schema({
  eduId: { type: String, trim: true, maxlength: 20 },
  school: { type: String, required: true, trim: true, maxlength: 200 },
  schoolDomain: { type: String, trim: true, maxlength: 120 },
  schoolLogo: { type: String, trim: true, maxlength: 2000 },
  degree: { type: String, required: true, trim: true, maxlength: 80 },
  fieldOfStudy: { type: String, trim: true, maxlength: 120 },
  currentEducation: { type: Boolean, default: false },
  startDate: { type: String, trim: true, maxlength: 20 },
  endDate: { type: String, trim: true, maxlength: 20 },
  grade: { type: String, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 2000 },
  activity: { type: String, trim: true, maxlength: 500 },
  refCode: { type: String, trim: true, maxlength: 40 },
}, { _id: false });

const CertificationSchema = new Schema({
  certId: { type: String, trim: true, maxlength: 20 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  issuingOrganization: { type: String, required: true, trim: true, maxlength: 120 },
  issuerLogo: { type: String, trim: true, maxlength: 2000 },
  currentlyValid: { type: Boolean, default: false },
  issueDate: { type: String, trim: true, maxlength: 20 },
  expirationDate: { type: String, trim: true, maxlength: 20 },
  certValType: { type: String, trim: true, maxlength: 20 },
  credentialId: { type: String, trim: true, maxlength: 80 },
  credentialUrl: { type: String, trim: true, maxlength: 500 },
  description: { type: String, trim: true, maxlength: 2000 },
  skills: { type: [String], default: [], maxlength: 30 },
  media: {
    type: [{ url: { type: String, required: true, trim: true, maxlength: 500 }, title: { type: String, trim: true, maxlength: 120 }, altText: { type: String, trim: true, maxlength: 200 } }],
    default: [],
    maxlength: 5,
    _id: false,
  },
}, { _id: false });

const ProjectSchema = new Schema({
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
    type: [{ url: { type: String, required: true, trim: true, maxlength: 500 }, title: { type: String, trim: true, maxlength: 120 }, altText: { type: String, trim: true, maxlength: 200 } }],
    default: [],
    maxlength: 5,
    _id: false,
  },
}, { _id: false });

const OpenSourceContributionSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  repository: { type: String, trim: true, maxlength: 200 },
  repositoryUrl: { type: String, trim: true, maxlength: 500 },
  active: { type: Boolean, default: false },
  activeFrom: { type: String, trim: true, maxlength: 20 },
  endDate: { type: String, trim: true, maxlength: 20 },
  description: { type: String, trim: true, maxlength: 2000 },
}, { _id: false });

const SetupItemSchema = new Schema({
  label: { type: String, required: true, trim: true, maxlength: 80 },
  imageUrl: { type: String, required: true, trim: true, maxlength: 500 },
  productUrl: { type: String, trim: true, maxlength: 500 },
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    profileImg: {
      type: String,
      default: DEFAULT_AVATAR_URL,
    },
    coverBanner: { type: String },
    gender: { type: String },
    job: { type: String },
    bio: {
      type: String,
      default: 'Welcome to Syntax Stories 🧑🏻‍💻, you can add your bio you want..🚀',
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
    workExperiences: { type: [WorkExperienceSchema], default: [], maxlength: 5 },
    education: { type: [EducationSchema], default: [] },
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
    googleId: { type: String, sparse: true },
    gitId: { type: String, sparse: true },
    facebookId: { type: String, sparse: true },
    appleId: { type: String, sparse: true },
    xId: { type: String, sparse: true },
    discordId: { type: String, sparse: true },
    googleToken: { type: String, select: false },
    githubToken: { type: String, select: false },
    facebookToken: { type: String, select: false },
    xToken: { type: String, select: false },
    appleToken: { type: String, select: false },
    discordToken: { type: String, select: false },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    subscription: { type: Schema.Types.ObjectId, ref: 'subscriptions', default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const UserModel: Model<IUser> =
  mongoose.models?.users ?? mongoose.model<IUser>('users', UserSchema);
