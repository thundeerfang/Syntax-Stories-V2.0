import { z } from 'zod';
import { BIO_MAX_LENGTH, STACK_AND_TOOLS_MAX, STACK_TOOL_NAME_MAX } from './profileLimits.js';

/**
 * Shared request-shape contracts for profile PATCH bodies.
 * Server validates with Zod (`server/src/middlewares/auth/profileZodSchemas.ts`); use these for client checks and shared typing.
 */

const optionalUriOrEmpty = z.union([z.string().url().max(500), z.literal('')]).optional();

export const profileBasicPatchSchema = z
  .object({
    fullName: z.string().min(1).max(100).optional(),
    username: z.string().min(2).max(30).regex(/^\w+$/).optional(),
    bio: z.string().max(BIO_MAX_LENGTH).optional(),
    /** Server may store DiceBear SVG data URIs (~15k+). */
    profileImg: z.string().max(131072).optional(),
    profileImgAlt: z.string().max(120).optional(),
    coverBanner: z.string().max(2000).optional(),
    coverBannerAlt: z.string().max(120).optional(),
    job: z.string().max(100).optional(),
    portfolioUrl: optionalUriOrEmpty,
    isGoogleAccount: z.boolean().optional(),
    isGitAccount: z.boolean().optional(),
    isFacebookAccount: z.boolean().optional(),
    isXAccount: z.boolean().optional(),
    isAppleAccount: z.boolean().optional(),
    isDiscordAccount: z.boolean().optional(),
  })
  .strict();

/** `PATCH /auth/profile/stack` — `stackAndTools` is not part of `basic` on the server. */
export const profileStackPatchSchema = z
  .object({
    stackAndTools: z.array(z.string().max(STACK_TOOL_NAME_MAX)).max(STACK_AND_TOOLS_MAX),
  })
  .strict();

export const profileSocialPatchSchema = z
  .object({
    linkedin: optionalUriOrEmpty,
    instagram: z.string().max(200).optional(),
    github: optionalUriOrEmpty,
    youtube: optionalUriOrEmpty,
  })
  .strict();

export const profileCertificationsPatchSchema = z
  .object({
    certifications: z.array(z.record(z.unknown())).max(30),
  })
  .strict();

export const profileProjectsPatchSchema = z
  .object({
    projects: z.array(z.record(z.unknown())).max(30).optional(),
    openSourceContributions: z.array(z.record(z.unknown())).max(30).optional(),
    isGitAccount: z.boolean().optional(),
  })
  .strict()
  .refine(
    (o: { projects?: unknown; openSourceContributions?: unknown; isGitAccount?: unknown }) =>
      o.projects !== undefined ||
      o.openSourceContributions !== undefined ||
      o.isGitAccount !== undefined,
    {
      message: 'Provide projects, openSourceContributions, and/or isGitAccount',
    }
  );

export const profileSetupPatchSchema = z
  .object({
    mySetup: z.array(z.record(z.unknown())).max(5),
  })
  .strict();

export const profileBlogStreakPatchSchema = z
  .object({
    blogStreakMode: z.enum(['daily', 'weekly', 'monthly']),
  })
  .strict();

export const profileUpdateSectionSchema = z.enum([
  'basic',
  'social',
  'stack',
  'certifications',
  'projects',
  'setup',
  'blog-streak',
]);

export type ProfileUpdateSection = z.infer<typeof profileUpdateSectionSchema>;

export type ProfileBasicPatch = z.infer<typeof profileBasicPatchSchema>;
export type ProfileStackPatch = z.infer<typeof profileStackPatchSchema>;
export type ProfileSocialPatch = z.infer<typeof profileSocialPatchSchema>;
export type ProfileCertificationsPatch = z.infer<typeof profileCertificationsPatchSchema>;
export type ProfileProjectsPatch = z.infer<typeof profileProjectsPatchSchema>;
export type ProfileSetupPatch = z.infer<typeof profileSetupPatchSchema>;
export type ProfileBlogStreakPatch = z.infer<typeof profileBlogStreakPatchSchema>;
