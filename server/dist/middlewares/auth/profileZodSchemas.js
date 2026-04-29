import { z } from 'zod';
function isMonthYear(val) {
    return typeof val === 'string' && /^\d{4}-\d{2}$/.test(val);
}
function compareMonthYear(a, b) {
    if (a === b)
        return 0;
    return a < b ? -1 : 1;
}
function safeMonthYear(val) {
    if (!isMonthYear(val))
        return '';
    const [yStr, mStr] = val.split('-');
    const y = Number.parseInt(yStr, 10);
    const m = Number.parseInt(mStr, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m))
        return '';
    const maxYear = new Date().getFullYear();
    if (y < 1980 || y > maxYear)
        return '';
    if (m < 1 || m > 12)
        return '';
    return val;
}
const uriMax = (max) => z.union([z.string().url().max(max).trim(), z.literal('')]);
const optUriMax = (max) => uriMax(max).optional();
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
const promotionItemSchema = z.object({
    jobTitle: z.string().max(120).trim(),
    startDate: z.string().max(20).trim().optional(),
    endDate: z.string().max(20).trim().optional(),
    currentPosition: z.boolean().optional(),
    media: z.array(mediaItemSchema).max(5).optional(),
});
function refineWorkMainWindow(start, end, ctx) {
    if (start && end && compareMonthYear(end, start) < 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['endDate'],
            message: 'Work experience end date cannot be earlier than start date.',
        });
    }
}
function refinePromotionChainEnds(promos, ctx) {
    for (let i = 0; i < promos.length - 1; i++) {
        const pe = safeMonthYear(promos[i]?.endDate);
        if (!pe) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['promotions', i, 'endDate'],
                message: `Promotion ${i + 1} must have an end date when a later promotion exists.`,
            });
        }
    }
}
function refineEachPromotionAgainstJob(promos, start, end, ctx) {
    for (let i = 0; i < promos.length; i++) {
        const ps = safeMonthYear(promos[i]?.startDate);
        const pe = safeMonthYear(promos[i]?.endDate);
        if (start && ps && compareMonthYear(ps, start) < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['promotions', i, 'startDate'],
                message: `Promotion ${i + 1} start date cannot be earlier than the job start date.`,
            });
        }
        if (ps && pe && compareMonthYear(pe, ps) < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['promotions', i, 'endDate'],
                message: `Promotion ${i + 1} end date cannot be earlier than its start date.`,
            });
        }
        if (!end)
            continue;
        if (ps && compareMonthYear(ps, end) > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['promotions', i, 'startDate'],
                message: `Promotion ${i + 1} start date cannot be after the job end date.`,
            });
        }
        if (pe && compareMonthYear(pe, end) > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['promotions', i, 'endDate'],
                message: `Promotion ${i + 1} end date cannot be after the job end date.`,
            });
        }
    }
}
function refineJobEndVsLatestPromotion(end, promos, ctx) {
    if (!end)
        return;
    const latestPromoEnd = promos
        .map((p) => safeMonthYear(p?.endDate))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .pop();
    if (latestPromoEnd && compareMonthYear(end, latestPromoEnd) < 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['endDate'],
            message: 'Employment end date must be on/after the last promotion end date.',
        });
    }
}
function workExperienceRefine(val, ctx) {
    const start = safeMonthYear(val.startDate);
    const end = val.currentPosition ? '' : safeMonthYear(val.endDate);
    refineWorkMainWindow(start, end, ctx);
    const promosRaw = Array.isArray(val.promotions) ? val.promotions : [];
    const promos = promosRaw.filter((p) => p && typeof p.jobTitle === 'string' && p.jobTitle.trim());
    refinePromotionChainEnds(promos, ctx);
    refineEachPromotionAgainstJob(promos, start, end, ctx);
    refineJobEndVsLatestPromotion(end, promos, ctx);
}
export const workExperienceItemSchema = z
    .object({
    workId: z.string().max(20).trim().optional(),
    jobTitle: z.string().max(120).trim(),
    employmentType: z.string().max(50).trim(),
    company: z.string().max(200).trim(),
    companyDomain: z.string().max(120).trim().optional(),
    companyLogo: optUriMax(500),
    currentPosition: z.boolean().optional(),
    startDate: z.string().max(20).trim(),
    endDate: z.string().max(20).trim().nullable().optional(),
    location: z.string().max(180).trim().optional(),
    locationType: z.string().max(20).trim(),
    description: z.string().max(5000).trim().optional(),
    skills: z.array(z.string().max(80).trim()).min(1).max(10),
    promotions: z.array(promotionItemSchema).max(5).optional(),
    mediaUrls: z.array(z.string().url().max(500)).max(5).optional(),
    media: z.array(mediaItemSchema).max(5).optional(),
})
    .superRefine((val, ctx) => {
    if (val.currentPosition === false) {
        const ed = val.endDate;
        if (ed == null || String(ed).trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['endDate'],
                message: 'Required',
            });
        }
    }
    workExperienceRefine(val, ctx);
});
export const educationItemSchema = z
    .object({
    eduId: z.string().max(20).trim().optional(),
    school: z.string().max(200).trim(),
    schoolDomain: z.string().max(120).trim().optional(),
    schoolLogo: optUriMax(2000),
    degree: z.string().max(80).trim(),
    fieldOfStudy: z.string().max(120).trim().optional(),
    currentEducation: z.boolean().optional(),
    startDate: z.string().max(20).trim(),
    endDate: z.string().max(20).trim().nullable().optional(),
    grade: z.string().max(80).trim().optional(),
    description: z.string().max(2000).trim().optional(),
    activity: z.string().max(500).trim().optional(),
    refCode: z.string().max(40).trim().optional(),
})
    .superRefine((val, ctx) => {
    if (val.currentEducation === false) {
        const ed = val.endDate;
        if (ed == null || String(ed).trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['endDate'],
                message: 'Required',
            });
        }
    }
});
export const certificationItemSchema = z.object({
    certId: z.string().max(20).trim().optional(),
    name: z.string().max(120).trim(),
    issuingOrganization: z.string().max(120).trim(),
    issuerLogo: optUriMax(2000),
    currentlyValid: z.boolean().optional(),
    issueDate: z.string().max(20).trim(),
    expirationDate: z.string().max(20).trim().optional(),
    certValType: z.string().max(20).trim().optional(),
    credentialId: z.string().max(80).trim().optional(),
    credentialUrl: optUriMax(500),
    description: z.string().max(2000).trim().optional(),
    skills: z.array(z.string().max(80).trim()).min(1).max(30),
    media: z.array(mediaItemSchema).max(5).optional(),
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
    if (src === 'github')
        return;
    if (!val.publisher?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['publisher'],
            message: 'Required',
        });
    }
    if (!val.publicationDate?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['publicationDate'],
            message: 'Required',
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
            message: 'You can link up to 7 GitHub repositories in Open Source. Remove one to add another.',
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
    bio: z.string().max(500).trim().optional(),
    profileImg: z.string().max(2000).trim().optional(),
    coverBanner: z.string().max(2000).trim().optional(),
    job: z.string().max(100).trim().optional(),
    portfolioUrl: optUriMax(500),
    linkedin: z.union([z.string().url().trim(), z.literal('')]).optional(),
    instagram: z.string().max(200).trim().optional(),
    github: z.union([z.string().url().trim(), z.literal('')]).optional(),
    youtube: z.union([z.string().url().trim(), z.literal('')]).optional(),
    stackAndTools: z.array(z.string().max(80)).max(10).optional(),
    workExperiences: z.array(workExperienceItemSchema).max(5).optional(),
    education: z.array(educationItemSchema).max(15).optional(),
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
};
export const updateProfileSchema = z
    .object({
    ...profilePatchFields,
    expectedProfileVersion: expectedProfileVersionField,
})
    .refine((data) => Object.keys(data).filter((k) => k !== 'expectedProfileVersion').length > 0, {
    message: 'At least one field is required',
    path: [],
});
export const updateProfileBasicSchema = z
    .object({
    fullName: profilePatchFields.fullName,
    username: profilePatchFields.username,
    bio: profilePatchFields.bio,
    profileImg: profilePatchFields.profileImg,
    coverBanner: profilePatchFields.coverBanner,
    job: profilePatchFields.job,
    portfolioUrl: profilePatchFields.portfolioUrl,
    isGoogleAccount: profilePatchFields.isGoogleAccount,
    isGitAccount: profilePatchFields.isGitAccount,
    isFacebookAccount: profilePatchFields.isFacebookAccount,
    isXAccount: profilePatchFields.isXAccount,
    isAppleAccount: profilePatchFields.isAppleAccount,
    isDiscordAccount: profilePatchFields.isDiscordAccount,
    expectedProfileVersion: expectedProfileVersionField,
})
    .refine((data) => Object.keys(data).filter((k) => k !== 'expectedProfileVersion').length > 0, {
    message: 'At least one field is required',
    path: [],
});
export const updateProfileSocialSchema = z
    .object({
    linkedin: profilePatchFields.linkedin,
    instagram: profilePatchFields.instagram,
    github: profilePatchFields.github,
    youtube: profilePatchFields.youtube,
    expectedProfileVersion: expectedProfileVersionField,
})
    .refine((data) => Object.keys(data).filter((k) => k !== 'expectedProfileVersion').length > 0, {
    message: 'At least one field is required',
    path: [],
});
export const updateProfileStackSchema = z.object({
    stackAndTools: z.array(z.string().max(80)).max(10),
    expectedProfileVersion: expectedProfileVersionField,
});
export const updateProfileWorkSchema = z.object({
    workExperiences: z.array(workExperienceItemSchema).max(5),
    expectedProfileVersion: expectedProfileVersionField,
});
export const updateProfileEducationSchema = z.object({
    education: z.array(educationItemSchema).max(15),
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
    .refine((d) => d.projects !== undefined || d.openSourceContributions !== undefined || d.isGitAccount !== undefined, {
    message: 'Provide projects, openSourceContributions, and/or isGitAccount',
    path: [],
});
export const updateProfileSetupSchema = z.object({
    mySetup: z.array(setupItemSchema).max(5),
    expectedProfileVersion: expectedProfileVersionField,
});
/** Legacy names (previously Joi schemas). */
export const workExperienceItem = workExperienceItemSchema;
export const educationItem = educationItemSchema;
export const certificationItem = certificationItemSchema;
export const projectItem = projectItemSchema;
export const openSourceItem = openSourceItemSchema;
export const setupItem = setupItemSchema;
//# sourceMappingURL=profileZodSchemas.js.map