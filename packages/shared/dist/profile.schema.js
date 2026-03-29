"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileUpdateSectionSchema = exports.profileSetupPatchSchema = exports.profileProjectsPatchSchema = exports.profileCertificationsPatchSchema = exports.profileEducationPatchSchema = exports.profileWorkPatchSchema = exports.profileSocialPatchSchema = exports.profileBasicPatchSchema = void 0;
const zod_1 = require("zod");
/**
 * Shared request-shape contracts for profile PATCH bodies.
 * Server still validates with Joi for nested rules; use these for client-side checks and to keep TS aligned.
 */
const optionalUriOrEmpty = zod_1.z.union([zod_1.z.string().url().max(500), zod_1.z.literal('')]).optional();
exports.profileBasicPatchSchema = zod_1.z
    .object({
    fullName: zod_1.z.string().min(1).max(100).optional(),
    username: zod_1.z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
    bio: zod_1.z.string().max(500).optional(),
    profileImg: zod_1.z.string().max(2000).optional(),
    coverBanner: zod_1.z.string().max(2000).optional(),
    job: zod_1.z.string().max(100).optional(),
    portfolioUrl: optionalUriOrEmpty,
    stackAndTools: zod_1.z.array(zod_1.z.string().max(80)).max(10).optional(),
    isGoogleAccount: zod_1.z.boolean().optional(),
    isGitAccount: zod_1.z.boolean().optional(),
    isFacebookAccount: zod_1.z.boolean().optional(),
    isXAccount: zod_1.z.boolean().optional(),
    isAppleAccount: zod_1.z.boolean().optional(),
    isDiscordAccount: zod_1.z.boolean().optional(),
})
    .strict();
exports.profileSocialPatchSchema = zod_1.z
    .object({
    linkedin: optionalUriOrEmpty,
    instagram: zod_1.z.string().max(200).optional(),
    github: optionalUriOrEmpty,
    youtube: optionalUriOrEmpty,
})
    .strict();
/** Deep array validation remains on the server (Joi); this bounds shape for shared typing. */
exports.profileWorkPatchSchema = zod_1.z
    .object({
    workExperiences: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).max(5),
})
    .strict();
exports.profileEducationPatchSchema = zod_1.z
    .object({
    education: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).max(15),
})
    .strict();
exports.profileCertificationsPatchSchema = zod_1.z
    .object({
    certifications: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).max(30),
})
    .strict();
exports.profileProjectsPatchSchema = zod_1.z
    .object({
    projects: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).max(30).optional(),
    openSourceContributions: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).max(30).optional(),
})
    .strict()
    .refine((o) => o.projects !== undefined || o.openSourceContributions !== undefined, {
    message: 'Provide projects and/or openSourceContributions',
});
exports.profileSetupPatchSchema = zod_1.z
    .object({
    mySetup: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).max(5),
})
    .strict();
exports.profileUpdateSectionSchema = zod_1.z.enum([
    'basic',
    'social',
    'work',
    'education',
    'certifications',
    'projects',
    'setup',
]);
