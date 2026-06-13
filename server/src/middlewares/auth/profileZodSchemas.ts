import { z } from 'zod';
import { BIO_MAX_LENGTH } from '../../variable/constants.js';
import {
  PROFILE_CERT_EXPIRATION_END_YEAR,
  PROFILE_DATE_START_YEAR,
} from '@syntax-stories/shared';

function isMonthYear(val: unknown): val is string {
  return typeof val === 'string' && /^\d{4}-\d{2}$/.test(val);
}

function compareMonthYear(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function safeMonthYear(val: unknown, maxYear = new Date().getFullYear()): string {
  if (!isMonthYear(val)) return '';
  const [yStr, mStr] = val.split('-');
  const y = Number.parseInt(yStr, 10);
  const m = Number.parseInt(mStr, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return '';
  if (y < PROFILE_DATE_START_YEAR || y > maxYear) return '';
  if (m < 1 || m > 12) return '';
  return val;
}

const uriMax = (max: number) => z.union([z.string().url().max(max).trim(), z.literal('')]);

const optUriMax = (max: number) => uriMax(max).optional();

/** Optimistic concurrency: client sends last seen `user.profileVersion` (from GET /me). */
export const expectedProfileVersionField = z.coerce.number().int().min(0).optional();

const mediaItemSchema = z.object({
  url: z.string().url().max(500).trim(),
  // When present, title must be non-empty after trimming.
  title: z
    .string()
    .max(120)
    .trim()
    .min(1, { message: 'Media title, if provided, cannot be empty.' })
    .optional(),
});

export const certificationItemSchema = z
  .object({
    certId: z.string().max(20).trim().optional(),
    name: z.string().max(120).trim(),
    issuingOrganization: z.string().max(120).trim(),
    issuerLogo: optUriMax(2000),
    issuerLogoAlt: z.string().max(120).trim().optional(),
    currentlyValid: z.boolean().optional(),
    issueDate: z.string().max(20).trim(),
    expirationDate: z.string().max(20).trim().optional(),
    certValType: z.string().max(20).trim().optional(),
    credentialId: z.string().max(80).trim().optional(),
    credentialUrl: optUriMax(500),
    description: z.string().max(2000).trim().optional(),
    skills: z.array(z.string().max(80).trim()).min(1).max(30),
    media: z.array(mediaItemSchema).max(5).optional(),
  })
  .superRefine((val, ctx) => {
    const issue = safeMonthYear(val.issueDate);
    if (!issue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['issueDate'],
        message: 'Invalid issue date.',
      });
      return;
    }

    const expRaw = val.expirationDate?.trim();
    if (!expRaw) return;

    const exp = safeMonthYear(expRaw, PROFILE_CERT_EXPIRATION_END_YEAR);
    if (!exp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expirationDate'],
        message: `Expiration date must be between ${PROFILE_DATE_START_YEAR} and ${PROFILE_CERT_EXPIRATION_END_YEAR}.`,
      });
      return;
    }

    if (compareMonthYear(exp, issue) < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expirationDate'],
        message: 'Expiration date cannot be earlier than issue date.',
      });
    }
  });

export const projectItemSchema = z
  .object({
    type: z.enum(['project', 'publication']).default('project'),
    source: z.union([z.literal('github'), z.literal('')]).optional(),
    repoFullName: z.string().max(200).trim().optional(),
    repoId: z.number().int().optional(),
    title: z.string().max(120).trim(),
    publisher: z.string().max(120).trim().optional(),
    ongoing: z.boolean().optional(),
    publicationDate: z.string().max(20).trim().optional(),
    endDate: z.string().max(20).trim().optional(),
    publicationUrl: optUriMax(500),
    description: z.string().max(2000).trim().optional(),
    prjLog: z.string().max(20).trim().optional(),
    media: z.array(mediaItemSchema).max(5).optional(),
  })
  .superRefine((val, ctx) => {
    const src = String(val.source ?? '').trim();
    if (src === 'github') return;

    if (!val.publisher?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publisher'],
        message: 'Required',
      });
    }

    const pubRaw = val.publicationDate?.trim();
    if (!pubRaw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publicationDate'],
        message: 'Required',
      });
      return;
    }

    const pub = safeMonthYear(pubRaw);
    if (!pub) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publicationDate'],
        message: 'Invalid publication date.',
      });
      return;
    }

    if (val.ongoing) return;

    const endRaw = val.endDate?.trim();
    if (!endRaw) return;

    const end = safeMonthYear(endRaw, PROFILE_CERT_EXPIRATION_END_YEAR);
    if (!end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: `End date must be between ${PROFILE_DATE_START_YEAR} and ${PROFILE_CERT_EXPIRATION_END_YEAR}.`,
      });
      return;
    }

    if (compareMonthYear(end, pub) < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date cannot be earlier than publication date.',
      });
    }
  });

export const openSourceItemSchema = z.object({
  title: z.string().max(120).trim(),
  repository: z.string().max(200).trim().optional(),
  repositoryUrl: optUriMax(500),
  active: z.boolean().optional(),
  activeFrom: z.string().max(20).trim().optional(),
  endDate: z.string().max(20).trim().optional(),
  description: z.string().max(2000).trim().optional(),
});

export const setupItemSchema = z.object({
  label: z.string().max(80).trim(),
  imageUrl: z.string().url().max(500).trim(),
  productUrl: optUriMax(500),
  imageAlt: z.string().max(120).trim().optional(),
});

const projectsArraySchema = z
  .array(projectItemSchema)
  .max(30)
  .superRefine((arr, ctx) => {
    const githubCount = arr.filter((p) => String(p?.source ?? '').trim() === 'github').length;
    if (githubCount > 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['projects'],
        message:
          'You can link up to 7 GitHub repositories in Open Source. Remove one to add another.',
      });
    }
  });

const usernameSchema = z
  .string()
  .min(2)
  .max(30)
  .regex(/^\w+$/)
  .trim()
  .transform((s) => s.toLowerCase());

const profilePatchFields = {
  fullName: z.string().min(1).max(100).trim().optional(),
  username: usernameSchema.optional(),
  bio: z.string().max(BIO_MAX_LENGTH).trim().optional(),
  /** Data URIs (DiceBear SVG) can be ~15k+; HTTPS URLs stay well under this cap. */
  profileImg: z.string().max(131072).trim().optional(),
  profileImgAlt: z.string().max(120).trim().optional(),
  coverBanner: z.string().max(2000).trim().optional(),
  coverBannerAlt: z.string().max(120).trim().optional(),
  job: z.string().max(100).trim().optional(),
  profileLocation: z.string().max(180).trim().optional(),
  portfolioUrl: optUriMax(500),
  linkedin: z.union([z.string().url().trim(), z.literal('')]).optional(),
  instagram: z.string().max(200).trim().optional(),
  github: z.union([z.string().url().trim(), z.literal('')]).optional(),
  youtube: z.union([z.string().url().trim(), z.literal('')]).optional(),
  stackAndTools: z.array(z.string().max(80)).max(10).optional(),
  certifications: z.array(certificationItemSchema).max(30).optional(),
  projects: projectsArraySchema.optional(),
  openSourceContributions: z.array(openSourceItemSchema).max(30).optional(),
  mySetup: z.array(setupItemSchema).max(5).optional(),
  isGoogleAccount: z.boolean().optional(),
  isGitAccount: z.boolean().optional(),
  isFacebookAccount: z.boolean().optional(),
  isXAccount: z.boolean().optional(),
  isAppleAccount: z.boolean().optional(),
  isDiscordAccount: z.boolean().optional(),
  blogStreakMode: z.enum(['daily', 'weekly', 'monthly']).optional(),
};

export const updateProfileSchema = z
  .object({
    ...profilePatchFields,
    expectedProfileVersion: expectedProfileVersionField,
  })
  .refine(
    (data: Record<string, unknown>) =>
      Object.keys(data).filter((k) => k !== 'expectedProfileVersion').length > 0,
    {
      message: 'At least one field is required',
      path: [],
    }
  );

export const updateProfileBasicSchema = z
  .object({
    fullName: profilePatchFields.fullName,
    username: profilePatchFields.username,
    bio: profilePatchFields.bio,
    profileImg: profilePatchFields.profileImg,
    profileImgAlt: profilePatchFields.profileImgAlt,
    coverBanner: profilePatchFields.coverBanner,
    coverBannerAlt: profilePatchFields.coverBannerAlt,
    job: profilePatchFields.job,
    profileLocation: profilePatchFields.profileLocation,
    portfolioUrl: profilePatchFields.portfolioUrl,
    isGoogleAccount: profilePatchFields.isGoogleAccount,
    isGitAccount: profilePatchFields.isGitAccount,
    isFacebookAccount: profilePatchFields.isFacebookAccount,
    isXAccount: profilePatchFields.isXAccount,
    isAppleAccount: profilePatchFields.isAppleAccount,
    isDiscordAccount: profilePatchFields.isDiscordAccount,
    expectedProfileVersion: expectedProfileVersionField,
  })
  .refine(
    (data: Record<string, unknown>) =>
      Object.keys(data).filter((k) => k !== 'expectedProfileVersion').length > 0,
    {
      message: 'At least one field is required',
      path: [],
    }
  );

export const updateProfileSocialSchema = z
  .object({
    linkedin: profilePatchFields.linkedin,
    instagram: profilePatchFields.instagram,
    github: profilePatchFields.github,
    youtube: profilePatchFields.youtube,
    expectedProfileVersion: expectedProfileVersionField,
  })
  .refine(
    (data: Record<string, unknown>) =>
      Object.keys(data).filter((k) => k !== 'expectedProfileVersion').length > 0,
    {
      message: 'At least one field is required',
      path: [],
    }
  );

export const updateProfileStackSchema = z.object({
  stackAndTools: z.array(z.string().max(80)).max(10),
  expectedProfileVersion: expectedProfileVersionField,
});

export const updateProfileCertificationsSchema = z.object({
  certifications: z.array(certificationItemSchema).max(30),
  expectedProfileVersion: expectedProfileVersionField,
});

export const updateProfileProjectsSchema = z
  .object({
    projects: projectsArraySchema.optional(),
    openSourceContributions: z.array(openSourceItemSchema).max(30).optional(),
    isGitAccount: z.boolean().optional(),
    expectedProfileVersion: expectedProfileVersionField,
  })
  .refine(
    (d: { projects?: unknown; openSourceContributions?: unknown; isGitAccount?: unknown }) =>
      d.projects !== undefined ||
      d.openSourceContributions !== undefined ||
      d.isGitAccount !== undefined,
    {
      message: 'Provide projects, openSourceContributions, and/or isGitAccount',
      path: [],
    }
  );

export const updateProfileSetupSchema = z.object({
  mySetup: z.array(setupItemSchema).max(5),
  expectedProfileVersion: expectedProfileVersionField,
});

export const updateProfileBlogStreakSchema = z.object({
  blogStreakMode: z.enum(['daily', 'weekly', 'monthly']),
  expectedProfileVersion: expectedProfileVersionField,
});

/** Legacy names (previously Joi schemas). */
export const certificationItem = certificationItemSchema;
export const projectItem = projectItemSchema;
export const openSourceItem = openSourceItemSchema;
export const setupItem = setupItemSchema;
