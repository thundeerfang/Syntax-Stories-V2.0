/**
 * Profile & account JSON API shapes — `/auth/me`, `/auth/profile`, `/auth/parse-cv`.
 * Runtime client: `webapp/src/api/auth.ts`. Keep in sync with server auth module.
 */

export interface WorkExperience {
  workId?: string;
  jobTitle?: string;
  employmentType?: string;
  company?: string;
  companyDomain?: string;
  companyLogo?: string;
  companyLogoAlt?: string;
  currentPosition?: boolean;
  startDate?: string;
  endDate?: string;
  location?: string;
  locationType?: string;
  description?: string;
  skills?: string[];
  mediaUrls?: string[];
  media?: { url: string; title?: string }[];
  role?: string;
}

export interface EducationItem {
  eduId?: string;
  school?: string;
  schoolDomain?: string;
  schoolLogo?: string;
  schoolLogoAlt?: string;
  degree?: string;
  fieldOfStudy?: string;
  field?: string;
  currentEducation?: boolean;
  startDate?: string;
  endDate?: string;
  startYear?: number;
  endYear?: number;
  grade?: string;
  description?: string;
  activity?: string;
  refCode?: string;
}

export interface CertificationItem {
  certId?: string;
  name?: string;
  issuingOrganization?: string;
  issuerLogo?: string;
  issuerLogoAlt?: string;
  currentlyValid?: boolean;
  issueDate?: string;
  expirationDate?: string;
  certValType?: string;
  credentialId?: string;
  credentialUrl?: string;
  description?: string;
  skills?: string[];
  media?: { url: string; title?: string }[];
}

export interface ProjectItem {
  type?: 'project' | 'publication';
  source?: 'github';
  repoFullName?: string;
  repoId?: number;
  title?: string;
  publisher?: string;
  ongoing?: boolean;
  publicationDate?: string;
  endDate?: string;
  publicationUrl?: string;
  description?: string;
  media?: { url: string; title?: string }[];
  prjLog?: string;
  name?: string;
  url?: string;
}

export interface OpenSourceContribution {
  title?: string;
  repository?: string;
  repositoryUrl?: string;
  active?: boolean;
  activeFrom?: string;
  endDate?: string;
  description?: string;
  repo?: string;
  url?: string;
}

export interface SetupItem {
  label: string;
  imageUrl: string;
  productUrl?: string;
  imageAlt?: string;
}

export interface AuthUser {
  id: string;
  _id?: string;
  fullName?: string;
  username?: string;
  email: string;
  name?: string;
  profileImg?: string;
  profileImgAlt?: string;
  image?: string;
  coverBanner?: string;
  coverBannerAlt?: string;
  bio?: string;
  job?: string;
  portfolioUrl?: string;
  linkedin?: string;
  instagram?: string;
  github?: string;
  youtube?: string;
  stackAndTools?: string[];
  workExperiences?: WorkExperience[];
  education?: EducationItem[];
  certifications?: CertificationItem[];
  projects?: ProjectItem[];
  openSourceContributions?: OpenSourceContribution[];
  mySetup?: SetupItem[];
  isGoogleAccount?: boolean;
  isGitAccount?: boolean;
  isFacebookAccount?: boolean;
  isXAccount?: boolean;
  isAppleAccount?: boolean;
  isDiscordAccount?: boolean;
  createdAt?: string;
  profileVersion?: number;
  profileUpdatedAt?: string;
  blogStreakMode?: 'daily' | 'weekly' | 'monthly';
}

export type AccountUser = {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  profileImg?: string;
  profileImgAlt?: string;
  coverBanner?: string;
  coverBannerAlt?: string;
  bio?: string;
  job?: string;
  portfolioUrl?: string;
  linkedin?: string;
  instagram?: string;
  github?: string;
  youtube?: string;
  stackAndTools?: string[];
  workExperiences?: WorkExperience[];
  education?: EducationItem[];
  certifications?: CertificationItem[];
  projects?: ProjectItem[];
  openSourceContributions?: OpenSourceContribution[];
  mySetup?: SetupItem[];
  isGoogleAccount?: boolean;
  isGitAccount?: boolean;
  isFacebookAccount?: boolean;
  isXAccount?: boolean;
  isAppleAccount?: boolean;
  isDiscordAccount?: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  profileVersion?: number;
  profileUpdatedAt?: string;
  blogStreakMode?: 'daily' | 'weekly' | 'monthly';
};

export type AccountResponseJson = {
  success?: boolean;
  message?: string;
  user?: AccountUser;
  data?: { user: AccountUser };
};

export interface AccountResponse {
  user: AccountUser;
  message?: string;
}

export type UpdateProfilePayload = Partial<{
  fullName: string;
  username: string;
  bio: string;
  profileImg: string;
  profileImgAlt: string;
  coverBanner: string;
  coverBannerAlt: string;
  job: string;
  portfolioUrl: string;
  linkedin: string;
  instagram: string;
  github: string;
  youtube: string;
  stackAndTools: string[];
  workExperiences: WorkExperience[];
  education: EducationItem[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
  openSourceContributions: OpenSourceContribution[];
  mySetup: SetupItem[];
  isGoogleAccount: boolean;
  isGitAccount: boolean;
  isFacebookAccount: boolean;
  isXAccount: boolean;
  isAppleAccount: boolean;
  isDiscordAccount: boolean;
  blogStreakMode: 'daily' | 'weekly' | 'monthly';
  expectedProfileVersion: number;
}>;

export type ParseCvMissingFieldKey =
  | 'bio'
  | 'linkedin'
  | 'github'
  | 'stackAndTools'
  | 'workExperiences'
  | 'education'
  | 'certifications';

export type IncompleteItemHint = { index: number; title?: string; missing: string[] };

export type IncompleteItemHints = {
  workExperiences?: IncompleteItemHint[];
  education?: IncompleteItemHint[];
  certifications?: IncompleteItemHint[];
  projects?: IncompleteItemHint[];
};

export interface ParseCvResponse {
  success: boolean;
  extracted: Partial<UpdateProfilePayload>;
  missingFields: ParseCvMissingFieldKey[];
  incompleteItemHints?: IncompleteItemHints;
}
