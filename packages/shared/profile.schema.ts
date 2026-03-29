import { z } from 'zod';

/**
 * Shared request-shape contracts for profile PATCH bodies.
 * Server validates with Zod (`server/src/middlewares/auth/profileZodSchemas.ts`); use these for client checks and shared typing.
 */

const optionalUriOrEmpty = z.union([z.string().url().max(500), z.literal('')]).optional();

export const profileBasicPatchSchema = z
  .object({
    fullName: z.string().min(1).max(100).optional(),
    username: z.string().min(2).max(30).regex(/^\w+$/).optional(),
    bio: z.string().max(500).optional(),
    profileImg: z.string().max(2000).optional(),
    coverBanner: z.string().max(2000).optional(),
    job: z.string().max(100).optional(),
    portfolioUrl: optionalUriOrEmpty,
    stackAndTools: z.array(z.string().max(80)).max(10).optional(),
    isGoogleAccount: z.boolean().optional(),
    isGitAccount: z.boolean().optional(),
    isFacebookAccount: z.boolean().optional(),
    isXAccount: z.boolean().optional(),
    isAppleAccount: z.boolean().optional(),
    isDiscordAccount: z.boolean().optional(),
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

/** Deep array rules are stricter on the server (Zod); this bounds shape for shared typing. */
export const profileWorkPatchSchema = z
  .object({
    workExperiences: z.array(z.record(z.unknown())).max(5),
  })
  .strict();

export const profileEducationPatchSchema = z
  .object({
    education: z.array(z.record(z.unknown())).max(15),
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
  })
  .strict()
  .refine((o) => o.projects !== undefined || o.openSourceContributions !== undefined, {
    message: 'Provide projects and/or openSourceContributions',
  });

export const profileSetupPatchSchema = z
  .object({
    mySetup: z.array(z.record(z.unknown())).max(5),
  })
  .strict();

export const profileUpdateSectionSchema = z.enum([
  'basic',
  'social',
  'work',
  'education',
  'certifications',
  'projects',
  'setup',
]);

export type ProfileUpdateSection = z.infer<typeof profileUpdateSectionSchema>;

export type ProfileBasicPatch = z.infer<typeof profileBasicPatchSchema>;
export type ProfileSocialPatch = z.infer<typeof profileSocialPatchSchema>;
export type ProfileWorkPatch = z.infer<typeof profileWorkPatchSchema>;
export type ProfileEducationPatch = z.infer<typeof profileEducationPatchSchema>;
export type ProfileCertificationsPatch = z.infer<typeof profileCertificationsPatchSchema>;
export type ProfileProjectsPatch = z.infer<typeof profileProjectsPatchSchema>;
export type ProfileSetupPatch = z.infer<typeof profileSetupPatchSchema>;
