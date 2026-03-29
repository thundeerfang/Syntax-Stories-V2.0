import { z } from 'zod';
export declare const profileBasicPatchSchema: z.ZodObject<{
    fullName: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    profileImg: z.ZodOptional<z.ZodString>;
    coverBanner: z.ZodOptional<z.ZodString>;
    job: z.ZodOptional<z.ZodString>;
    portfolioUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    stackAndTools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isGoogleAccount: z.ZodOptional<z.ZodBoolean>;
    isGitAccount: z.ZodOptional<z.ZodBoolean>;
    isFacebookAccount: z.ZodOptional<z.ZodBoolean>;
    isXAccount: z.ZodOptional<z.ZodBoolean>;
    isAppleAccount: z.ZodOptional<z.ZodBoolean>;
    isDiscordAccount: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    fullName?: string | undefined;
    username?: string | undefined;
    bio?: string | undefined;
    profileImg?: string | undefined;
    coverBanner?: string | undefined;
    job?: string | undefined;
    portfolioUrl?: string | undefined;
    stackAndTools?: string[] | undefined;
    isGoogleAccount?: boolean | undefined;
    isGitAccount?: boolean | undefined;
    isFacebookAccount?: boolean | undefined;
    isXAccount?: boolean | undefined;
    isAppleAccount?: boolean | undefined;
    isDiscordAccount?: boolean | undefined;
}, {
    fullName?: string | undefined;
    username?: string | undefined;
    bio?: string | undefined;
    profileImg?: string | undefined;
    coverBanner?: string | undefined;
    job?: string | undefined;
    portfolioUrl?: string | undefined;
    stackAndTools?: string[] | undefined;
    isGoogleAccount?: boolean | undefined;
    isGitAccount?: boolean | undefined;
    isFacebookAccount?: boolean | undefined;
    isXAccount?: boolean | undefined;
    isAppleAccount?: boolean | undefined;
    isDiscordAccount?: boolean | undefined;
}>;
export declare const profileSocialPatchSchema: z.ZodObject<{
    linkedin: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    instagram: z.ZodOptional<z.ZodString>;
    github: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    youtube: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
}, "strict", z.ZodTypeAny, {
    linkedin?: string | undefined;
    instagram?: string | undefined;
    github?: string | undefined;
    youtube?: string | undefined;
}, {
    linkedin?: string | undefined;
    instagram?: string | undefined;
    github?: string | undefined;
    youtube?: string | undefined;
}>;
/** Deep array validation remains on the server (Joi); this bounds shape for shared typing. */
export declare const profileWorkPatchSchema: z.ZodObject<{
    workExperiences: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
}, "strict", z.ZodTypeAny, {
    workExperiences: Record<string, unknown>[];
}, {
    workExperiences: Record<string, unknown>[];
}>;
export declare const profileEducationPatchSchema: z.ZodObject<{
    education: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
}, "strict", z.ZodTypeAny, {
    education: Record<string, unknown>[];
}, {
    education: Record<string, unknown>[];
}>;
export declare const profileCertificationsPatchSchema: z.ZodObject<{
    certifications: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
}, "strict", z.ZodTypeAny, {
    certifications: Record<string, unknown>[];
}, {
    certifications: Record<string, unknown>[];
}>;
export declare const profileProjectsPatchSchema: z.ZodEffects<z.ZodObject<{
    projects: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    openSourceContributions: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
}, "strict", z.ZodTypeAny, {
    projects?: Record<string, unknown>[] | undefined;
    openSourceContributions?: Record<string, unknown>[] | undefined;
}, {
    projects?: Record<string, unknown>[] | undefined;
    openSourceContributions?: Record<string, unknown>[] | undefined;
}>, {
    projects?: Record<string, unknown>[] | undefined;
    openSourceContributions?: Record<string, unknown>[] | undefined;
}, {
    projects?: Record<string, unknown>[] | undefined;
    openSourceContributions?: Record<string, unknown>[] | undefined;
}>;
export declare const profileSetupPatchSchema: z.ZodObject<{
    mySetup: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
}, "strict", z.ZodTypeAny, {
    mySetup: Record<string, unknown>[];
}, {
    mySetup: Record<string, unknown>[];
}>;
export declare const profileUpdateSectionSchema: z.ZodEnum<["basic", "social", "work", "education", "certifications", "projects", "setup"]>;
export type ProfileUpdateSection = z.infer<typeof profileUpdateSectionSchema>;
export type ProfileBasicPatch = z.infer<typeof profileBasicPatchSchema>;
export type ProfileSocialPatch = z.infer<typeof profileSocialPatchSchema>;
export type ProfileWorkPatch = z.infer<typeof profileWorkPatchSchema>;
export type ProfileEducationPatch = z.infer<typeof profileEducationPatchSchema>;
export type ProfileCertificationsPatch = z.infer<typeof profileCertificationsPatchSchema>;
export type ProfileProjectsPatch = z.infer<typeof profileProjectsPatchSchema>;
export type ProfileSetupPatch = z.infer<typeof profileSetupPatchSchema>;
