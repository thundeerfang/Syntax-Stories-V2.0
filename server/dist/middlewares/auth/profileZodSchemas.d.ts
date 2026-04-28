import { z } from 'zod';
/** Optimistic concurrency: client sends last seen `user.profileVersion` (from GET /me). */
export declare const expectedProfileVersionField: z.ZodOptional<z.ZodNumber>;
export declare const workExperienceItemSchema: z.ZodEffects<z.ZodObject<{
    workId: z.ZodOptional<z.ZodString>;
    jobTitle: z.ZodString;
    employmentType: z.ZodString;
    company: z.ZodString;
    companyDomain: z.ZodOptional<z.ZodString>;
    companyLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    companyLogoAlt: z.ZodOptional<z.ZodString>;
    currentPosition: z.ZodOptional<z.ZodBoolean>;
    startDate: z.ZodString;
    endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    location: z.ZodOptional<z.ZodString>;
    locationType: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    skills: z.ZodArray<z.ZodString, "many">;
    promotions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        jobTitle: z.ZodString;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        currentPosition: z.ZodOptional<z.ZodBoolean>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            title?: string | undefined;
        }, {
            url: string;
            title?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }, {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }>, "many">>;
    mediaUrls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        title?: string | undefined;
    }, {
        url: string;
        title?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    jobTitle: string;
    startDate: string;
    employmentType: string;
    company: string;
    locationType: string;
    skills: string[];
    endDate?: string | null | undefined;
    currentPosition?: boolean | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    promotions?: {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }[] | undefined;
    workId?: string | undefined;
    companyDomain?: string | undefined;
    companyLogo?: string | undefined;
    companyLogoAlt?: string | undefined;
    location?: string | undefined;
    description?: string | undefined;
    mediaUrls?: string[] | undefined;
}, {
    jobTitle: string;
    startDate: string;
    employmentType: string;
    company: string;
    locationType: string;
    skills: string[];
    endDate?: string | null | undefined;
    currentPosition?: boolean | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    promotions?: {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }[] | undefined;
    workId?: string | undefined;
    companyDomain?: string | undefined;
    companyLogo?: string | undefined;
    companyLogoAlt?: string | undefined;
    location?: string | undefined;
    description?: string | undefined;
    mediaUrls?: string[] | undefined;
}>, {
    jobTitle: string;
    startDate: string;
    employmentType: string;
    company: string;
    locationType: string;
    skills: string[];
    endDate?: string | null | undefined;
    currentPosition?: boolean | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    promotions?: {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }[] | undefined;
    workId?: string | undefined;
    companyDomain?: string | undefined;
    companyLogo?: string | undefined;
    companyLogoAlt?: string | undefined;
    location?: string | undefined;
    description?: string | undefined;
    mediaUrls?: string[] | undefined;
}, {
    jobTitle: string;
    startDate: string;
    employmentType: string;
    company: string;
    locationType: string;
    skills: string[];
    endDate?: string | null | undefined;
    currentPosition?: boolean | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    promotions?: {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }[] | undefined;
    workId?: string | undefined;
    companyDomain?: string | undefined;
    companyLogo?: string | undefined;
    companyLogoAlt?: string | undefined;
    location?: string | undefined;
    description?: string | undefined;
    mediaUrls?: string[] | undefined;
}>;
export declare const educationItemSchema: z.ZodEffects<z.ZodObject<{
    eduId: z.ZodOptional<z.ZodString>;
    school: z.ZodString;
    schoolDomain: z.ZodOptional<z.ZodString>;
    schoolLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    schoolLogoAlt: z.ZodOptional<z.ZodString>;
    degree: z.ZodString;
    fieldOfStudy: z.ZodOptional<z.ZodString>;
    currentEducation: z.ZodOptional<z.ZodBoolean>;
    startDate: z.ZodString;
    endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    grade: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activity: z.ZodOptional<z.ZodString>;
    refCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    startDate: string;
    school: string;
    degree: string;
    endDate?: string | null | undefined;
    description?: string | undefined;
    eduId?: string | undefined;
    schoolDomain?: string | undefined;
    schoolLogo?: string | undefined;
    schoolLogoAlt?: string | undefined;
    fieldOfStudy?: string | undefined;
    currentEducation?: boolean | undefined;
    grade?: string | undefined;
    activity?: string | undefined;
    refCode?: string | undefined;
}, {
    startDate: string;
    school: string;
    degree: string;
    endDate?: string | null | undefined;
    description?: string | undefined;
    eduId?: string | undefined;
    schoolDomain?: string | undefined;
    schoolLogo?: string | undefined;
    schoolLogoAlt?: string | undefined;
    fieldOfStudy?: string | undefined;
    currentEducation?: boolean | undefined;
    grade?: string | undefined;
    activity?: string | undefined;
    refCode?: string | undefined;
}>, {
    startDate: string;
    school: string;
    degree: string;
    endDate?: string | null | undefined;
    description?: string | undefined;
    eduId?: string | undefined;
    schoolDomain?: string | undefined;
    schoolLogo?: string | undefined;
    schoolLogoAlt?: string | undefined;
    fieldOfStudy?: string | undefined;
    currentEducation?: boolean | undefined;
    grade?: string | undefined;
    activity?: string | undefined;
    refCode?: string | undefined;
}, {
    startDate: string;
    school: string;
    degree: string;
    endDate?: string | null | undefined;
    description?: string | undefined;
    eduId?: string | undefined;
    schoolDomain?: string | undefined;
    schoolLogo?: string | undefined;
    schoolLogoAlt?: string | undefined;
    fieldOfStudy?: string | undefined;
    currentEducation?: boolean | undefined;
    grade?: string | undefined;
    activity?: string | undefined;
    refCode?: string | undefined;
}>;
export declare const certificationItemSchema: z.ZodObject<{
    certId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    issuingOrganization: z.ZodString;
    issuerLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    issuerLogoAlt: z.ZodOptional<z.ZodString>;
    currentlyValid: z.ZodOptional<z.ZodBoolean>;
    issueDate: z.ZodString;
    expirationDate: z.ZodOptional<z.ZodString>;
    certValType: z.ZodOptional<z.ZodString>;
    credentialId: z.ZodOptional<z.ZodString>;
    credentialUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    description: z.ZodOptional<z.ZodString>;
    skills: z.ZodArray<z.ZodString, "many">;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        title?: string | undefined;
    }, {
        url: string;
        title?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    skills: string[];
    name: string;
    issuingOrganization: string;
    issueDate: string;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    certId?: string | undefined;
    issuerLogo?: string | undefined;
    issuerLogoAlt?: string | undefined;
    currentlyValid?: boolean | undefined;
    expirationDate?: string | undefined;
    certValType?: string | undefined;
    credentialId?: string | undefined;
    credentialUrl?: string | undefined;
}, {
    skills: string[];
    name: string;
    issuingOrganization: string;
    issueDate: string;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    certId?: string | undefined;
    issuerLogo?: string | undefined;
    issuerLogoAlt?: string | undefined;
    currentlyValid?: boolean | undefined;
    expirationDate?: string | undefined;
    certValType?: string | undefined;
    credentialId?: string | undefined;
    credentialUrl?: string | undefined;
}>;
export declare const projectItemSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodDefault<z.ZodEnum<["project", "publication"]>>;
    source: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"github">, z.ZodLiteral<"">]>>;
    repoFullName: z.ZodOptional<z.ZodString>;
    repoId: z.ZodOptional<z.ZodNumber>;
    title: z.ZodString;
    publisher: z.ZodOptional<z.ZodString>;
    ongoing: z.ZodOptional<z.ZodBoolean>;
    publicationDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    publicationUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    description: z.ZodOptional<z.ZodString>;
    prjLog: z.ZodOptional<z.ZodString>;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        title?: string | undefined;
    }, {
        url: string;
        title?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    type: "project" | "publication";
    endDate?: string | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    source?: "" | "github" | undefined;
    repoFullName?: string | undefined;
    repoId?: number | undefined;
    publisher?: string | undefined;
    ongoing?: boolean | undefined;
    publicationDate?: string | undefined;
    publicationUrl?: string | undefined;
    prjLog?: string | undefined;
}, {
    title: string;
    type?: "project" | "publication" | undefined;
    endDate?: string | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    source?: "" | "github" | undefined;
    repoFullName?: string | undefined;
    repoId?: number | undefined;
    publisher?: string | undefined;
    ongoing?: boolean | undefined;
    publicationDate?: string | undefined;
    publicationUrl?: string | undefined;
    prjLog?: string | undefined;
}>, {
    title: string;
    type: "project" | "publication";
    endDate?: string | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    source?: "" | "github" | undefined;
    repoFullName?: string | undefined;
    repoId?: number | undefined;
    publisher?: string | undefined;
    ongoing?: boolean | undefined;
    publicationDate?: string | undefined;
    publicationUrl?: string | undefined;
    prjLog?: string | undefined;
}, {
    title: string;
    type?: "project" | "publication" | undefined;
    endDate?: string | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    source?: "" | "github" | undefined;
    repoFullName?: string | undefined;
    repoId?: number | undefined;
    publisher?: string | undefined;
    ongoing?: boolean | undefined;
    publicationDate?: string | undefined;
    publicationUrl?: string | undefined;
    prjLog?: string | undefined;
}>;
export declare const openSourceItemSchema: z.ZodObject<{
    title: z.ZodString;
    repository: z.ZodOptional<z.ZodString>;
    repositoryUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    active: z.ZodOptional<z.ZodBoolean>;
    activeFrom: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    endDate?: string | undefined;
    description?: string | undefined;
    repository?: string | undefined;
    repositoryUrl?: string | undefined;
    active?: boolean | undefined;
    activeFrom?: string | undefined;
}, {
    title: string;
    endDate?: string | undefined;
    description?: string | undefined;
    repository?: string | undefined;
    repositoryUrl?: string | undefined;
    active?: boolean | undefined;
    activeFrom?: string | undefined;
}>;
export declare const setupItemSchema: z.ZodObject<{
    label: z.ZodString;
    imageUrl: z.ZodString;
    productUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    imageAlt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    imageUrl: string;
    productUrl?: string | undefined;
    imageAlt?: string | undefined;
}, {
    label: string;
    imageUrl: string;
    productUrl?: string | undefined;
    imageAlt?: string | undefined;
}>;
export declare const updateProfileSchema: z.ZodEffects<z.ZodObject<{
    expectedProfileVersion: z.ZodOptional<z.ZodNumber>;
    fullName: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    bio: z.ZodOptional<z.ZodString>;
    profileImg: z.ZodOptional<z.ZodString>;
    profileImgAlt: z.ZodOptional<z.ZodString>;
    coverBanner: z.ZodOptional<z.ZodString>;
    coverBannerAlt: z.ZodOptional<z.ZodString>;
    job: z.ZodOptional<z.ZodString>;
    portfolioUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    linkedin: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    instagram: z.ZodOptional<z.ZodString>;
    github: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    youtube: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    stackAndTools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    workExperiences: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        workId: z.ZodOptional<z.ZodString>;
        jobTitle: z.ZodString;
        employmentType: z.ZodString;
        company: z.ZodString;
        companyDomain: z.ZodOptional<z.ZodString>;
        companyLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        companyLogoAlt: z.ZodOptional<z.ZodString>;
        currentPosition: z.ZodOptional<z.ZodBoolean>;
        startDate: z.ZodString;
        endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        location: z.ZodOptional<z.ZodString>;
        locationType: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        skills: z.ZodArray<z.ZodString, "many">;
        promotions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            jobTitle: z.ZodString;
            startDate: z.ZodOptional<z.ZodString>;
            endDate: z.ZodOptional<z.ZodString>;
            currentPosition: z.ZodOptional<z.ZodBoolean>;
            media: z.ZodOptional<z.ZodArray<z.ZodObject<{
                url: z.ZodString;
                title: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url: string;
                title?: string | undefined;
            }, {
                url: string;
                title?: string | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }, {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }>, "many">>;
        mediaUrls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            title?: string | undefined;
        }, {
            url: string;
            title?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }, {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }>, {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }, {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }>, "many">>;
    education: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        eduId: z.ZodOptional<z.ZodString>;
        school: z.ZodString;
        schoolDomain: z.ZodOptional<z.ZodString>;
        schoolLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        schoolLogoAlt: z.ZodOptional<z.ZodString>;
        degree: z.ZodString;
        fieldOfStudy: z.ZodOptional<z.ZodString>;
        currentEducation: z.ZodOptional<z.ZodBoolean>;
        startDate: z.ZodString;
        endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        grade: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        activity: z.ZodOptional<z.ZodString>;
        refCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }, {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }>, {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }, {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }>, "many">>;
    certifications: z.ZodOptional<z.ZodArray<z.ZodObject<{
        certId: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        issuingOrganization: z.ZodString;
        issuerLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        issuerLogoAlt: z.ZodOptional<z.ZodString>;
        currentlyValid: z.ZodOptional<z.ZodBoolean>;
        issueDate: z.ZodString;
        expirationDate: z.ZodOptional<z.ZodString>;
        certValType: z.ZodOptional<z.ZodString>;
        credentialId: z.ZodOptional<z.ZodString>;
        credentialUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        description: z.ZodOptional<z.ZodString>;
        skills: z.ZodArray<z.ZodString, "many">;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            title?: string | undefined;
        }, {
            url: string;
            title?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        skills: string[];
        name: string;
        issuingOrganization: string;
        issueDate: string;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        certId?: string | undefined;
        issuerLogo?: string | undefined;
        issuerLogoAlt?: string | undefined;
        currentlyValid?: boolean | undefined;
        expirationDate?: string | undefined;
        certValType?: string | undefined;
        credentialId?: string | undefined;
        credentialUrl?: string | undefined;
    }, {
        skills: string[];
        name: string;
        issuingOrganization: string;
        issueDate: string;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        certId?: string | undefined;
        issuerLogo?: string | undefined;
        issuerLogoAlt?: string | undefined;
        currentlyValid?: boolean | undefined;
        expirationDate?: string | undefined;
        certValType?: string | undefined;
        credentialId?: string | undefined;
        credentialUrl?: string | undefined;
    }>, "many">>;
    projects: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodDefault<z.ZodEnum<["project", "publication"]>>;
        source: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"github">, z.ZodLiteral<"">]>>;
        repoFullName: z.ZodOptional<z.ZodString>;
        repoId: z.ZodOptional<z.ZodNumber>;
        title: z.ZodString;
        publisher: z.ZodOptional<z.ZodString>;
        ongoing: z.ZodOptional<z.ZodBoolean>;
        publicationDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        publicationUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        description: z.ZodOptional<z.ZodString>;
        prjLog: z.ZodOptional<z.ZodString>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            title?: string | undefined;
        }, {
            url: string;
            title?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        type: "project" | "publication";
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }, {
        title: string;
        type?: "project" | "publication" | undefined;
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }>, {
        title: string;
        type: "project" | "publication";
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }, {
        title: string;
        type?: "project" | "publication" | undefined;
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }>, "many">, {
        title: string;
        type: "project" | "publication";
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[], {
        title: string;
        type?: "project" | "publication" | undefined;
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[]>>;
    openSourceContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        repository: z.ZodOptional<z.ZodString>;
        repositoryUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        active: z.ZodOptional<z.ZodBoolean>;
        activeFrom: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }, {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }>, "many">>;
    mySetup: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        imageUrl: z.ZodString;
        productUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        imageAlt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        imageUrl: string;
        productUrl?: string | undefined;
        imageAlt?: string | undefined;
    }, {
        label: string;
        imageUrl: string;
        productUrl?: string | undefined;
        imageAlt?: string | undefined;
    }>, "many">>;
    isGoogleAccount: z.ZodOptional<z.ZodBoolean>;
    isGitAccount: z.ZodOptional<z.ZodBoolean>;
    isFacebookAccount: z.ZodOptional<z.ZodBoolean>;
    isXAccount: z.ZodOptional<z.ZodBoolean>;
    isAppleAccount: z.ZodOptional<z.ZodBoolean>;
    isDiscordAccount: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    github?: string | undefined;
    expectedProfileVersion?: number | undefined;
    fullName?: string | undefined;
    username?: string | undefined;
    bio?: string | undefined;
    profileImg?: string | undefined;
    profileImgAlt?: string | undefined;
    coverBanner?: string | undefined;
    coverBannerAlt?: string | undefined;
    job?: string | undefined;
    portfolioUrl?: string | undefined;
    linkedin?: string | undefined;
    instagram?: string | undefined;
    youtube?: string | undefined;
    stackAndTools?: string[] | undefined;
    workExperiences?: {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }[] | undefined;
    education?: {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }[] | undefined;
    certifications?: {
        skills: string[];
        name: string;
        issuingOrganization: string;
        issueDate: string;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        certId?: string | undefined;
        issuerLogo?: string | undefined;
        issuerLogoAlt?: string | undefined;
        currentlyValid?: boolean | undefined;
        expirationDate?: string | undefined;
        certValType?: string | undefined;
        credentialId?: string | undefined;
        credentialUrl?: string | undefined;
    }[] | undefined;
    projects?: {
        title: string;
        type: "project" | "publication";
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[] | undefined;
    openSourceContributions?: {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }[] | undefined;
    mySetup?: {
        label: string;
        imageUrl: string;
        productUrl?: string | undefined;
        imageAlt?: string | undefined;
    }[] | undefined;
    isGoogleAccount?: boolean | undefined;
    isGitAccount?: boolean | undefined;
    isFacebookAccount?: boolean | undefined;
    isXAccount?: boolean | undefined;
    isAppleAccount?: boolean | undefined;
    isDiscordAccount?: boolean | undefined;
}, {
    github?: string | undefined;
    expectedProfileVersion?: number | undefined;
    fullName?: string | undefined;
    username?: string | undefined;
    bio?: string | undefined;
    profileImg?: string | undefined;
    profileImgAlt?: string | undefined;
    coverBanner?: string | undefined;
    coverBannerAlt?: string | undefined;
    job?: string | undefined;
    portfolioUrl?: string | undefined;
    linkedin?: string | undefined;
    instagram?: string | undefined;
    youtube?: string | undefined;
    stackAndTools?: string[] | undefined;
    workExperiences?: {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }[] | undefined;
    education?: {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }[] | undefined;
    certifications?: {
        skills: string[];
        name: string;
        issuingOrganization: string;
        issueDate: string;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        certId?: string | undefined;
        issuerLogo?: string | undefined;
        issuerLogoAlt?: string | undefined;
        currentlyValid?: boolean | undefined;
        expirationDate?: string | undefined;
        certValType?: string | undefined;
        credentialId?: string | undefined;
        credentialUrl?: string | undefined;
    }[] | undefined;
    projects?: {
        title: string;
        type?: "project" | "publication" | undefined;
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[] | undefined;
    openSourceContributions?: {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }[] | undefined;
    mySetup?: {
        label: string;
        imageUrl: string;
        productUrl?: string | undefined;
        imageAlt?: string | undefined;
    }[] | undefined;
    isGoogleAccount?: boolean | undefined;
    isGitAccount?: boolean | undefined;
    isFacebookAccount?: boolean | undefined;
    isXAccount?: boolean | undefined;
    isAppleAccount?: boolean | undefined;
    isDiscordAccount?: boolean | undefined;
}>, {
    github?: string | undefined;
    expectedProfileVersion?: number | undefined;
    fullName?: string | undefined;
    username?: string | undefined;
    bio?: string | undefined;
    profileImg?: string | undefined;
    profileImgAlt?: string | undefined;
    coverBanner?: string | undefined;
    coverBannerAlt?: string | undefined;
    job?: string | undefined;
    portfolioUrl?: string | undefined;
    linkedin?: string | undefined;
    instagram?: string | undefined;
    youtube?: string | undefined;
    stackAndTools?: string[] | undefined;
    workExperiences?: {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }[] | undefined;
    education?: {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }[] | undefined;
    certifications?: {
        skills: string[];
        name: string;
        issuingOrganization: string;
        issueDate: string;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        certId?: string | undefined;
        issuerLogo?: string | undefined;
        issuerLogoAlt?: string | undefined;
        currentlyValid?: boolean | undefined;
        expirationDate?: string | undefined;
        certValType?: string | undefined;
        credentialId?: string | undefined;
        credentialUrl?: string | undefined;
    }[] | undefined;
    projects?: {
        title: string;
        type: "project" | "publication";
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[] | undefined;
    openSourceContributions?: {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }[] | undefined;
    mySetup?: {
        label: string;
        imageUrl: string;
        productUrl?: string | undefined;
        imageAlt?: string | undefined;
    }[] | undefined;
    isGoogleAccount?: boolean | undefined;
    isGitAccount?: boolean | undefined;
    isFacebookAccount?: boolean | undefined;
    isXAccount?: boolean | undefined;
    isAppleAccount?: boolean | undefined;
    isDiscordAccount?: boolean | undefined;
}, {
    github?: string | undefined;
    expectedProfileVersion?: number | undefined;
    fullName?: string | undefined;
    username?: string | undefined;
    bio?: string | undefined;
    profileImg?: string | undefined;
    profileImgAlt?: string | undefined;
    coverBanner?: string | undefined;
    coverBannerAlt?: string | undefined;
    job?: string | undefined;
    portfolioUrl?: string | undefined;
    linkedin?: string | undefined;
    instagram?: string | undefined;
    youtube?: string | undefined;
    stackAndTools?: string[] | undefined;
    workExperiences?: {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }[] | undefined;
    education?: {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }[] | undefined;
    certifications?: {
        skills: string[];
        name: string;
        issuingOrganization: string;
        issueDate: string;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        certId?: string | undefined;
        issuerLogo?: string | undefined;
        issuerLogoAlt?: string | undefined;
        currentlyValid?: boolean | undefined;
        expirationDate?: string | undefined;
        certValType?: string | undefined;
        credentialId?: string | undefined;
        credentialUrl?: string | undefined;
    }[] | undefined;
    projects?: {
        title: string;
        type?: "project" | "publication" | undefined;
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[] | undefined;
    openSourceContributions?: {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }[] | undefined;
    mySetup?: {
        label: string;
        imageUrl: string;
        productUrl?: string | undefined;
        imageAlt?: string | undefined;
    }[] | undefined;
    isGoogleAccount?: boolean | undefined;
    isGitAccount?: boolean | undefined;
    isFacebookAccount?: boolean | undefined;
    isXAccount?: boolean | undefined;
    isAppleAccount?: boolean | undefined;
    isDiscordAccount?: boolean | undefined;
}>;
export declare const updateProfileBasicSchema: z.ZodEffects<z.ZodObject<{
    fullName: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    bio: z.ZodOptional<z.ZodString>;
    profileImg: z.ZodOptional<z.ZodString>;
    profileImgAlt: z.ZodOptional<z.ZodString>;
    coverBanner: z.ZodOptional<z.ZodString>;
    coverBannerAlt: z.ZodOptional<z.ZodString>;
    job: z.ZodOptional<z.ZodString>;
    portfolioUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    isGoogleAccount: z.ZodOptional<z.ZodBoolean>;
    isGitAccount: z.ZodOptional<z.ZodBoolean>;
    isFacebookAccount: z.ZodOptional<z.ZodBoolean>;
    isXAccount: z.ZodOptional<z.ZodBoolean>;
    isAppleAccount: z.ZodOptional<z.ZodBoolean>;
    isDiscordAccount: z.ZodOptional<z.ZodBoolean>;
    expectedProfileVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    expectedProfileVersion?: number | undefined;
    fullName?: string | undefined;
    username?: string | undefined;
    bio?: string | undefined;
    profileImg?: string | undefined;
    profileImgAlt?: string | undefined;
    coverBanner?: string | undefined;
    coverBannerAlt?: string | undefined;
    job?: string | undefined;
    portfolioUrl?: string | undefined;
    isGoogleAccount?: boolean | undefined;
    isGitAccount?: boolean | undefined;
    isFacebookAccount?: boolean | undefined;
    isXAccount?: boolean | undefined;
    isAppleAccount?: boolean | undefined;
    isDiscordAccount?: boolean | undefined;
}, {
    expectedProfileVersion?: number | undefined;
    fullName?: string | undefined;
    username?: string | undefined;
    bio?: string | undefined;
    profileImg?: string | undefined;
    profileImgAlt?: string | undefined;
    coverBanner?: string | undefined;
    coverBannerAlt?: string | undefined;
    job?: string | undefined;
    portfolioUrl?: string | undefined;
    isGoogleAccount?: boolean | undefined;
    isGitAccount?: boolean | undefined;
    isFacebookAccount?: boolean | undefined;
    isXAccount?: boolean | undefined;
    isAppleAccount?: boolean | undefined;
    isDiscordAccount?: boolean | undefined;
}>, {
    expectedProfileVersion?: number | undefined;
    fullName?: string | undefined;
    username?: string | undefined;
    bio?: string | undefined;
    profileImg?: string | undefined;
    profileImgAlt?: string | undefined;
    coverBanner?: string | undefined;
    coverBannerAlt?: string | undefined;
    job?: string | undefined;
    portfolioUrl?: string | undefined;
    isGoogleAccount?: boolean | undefined;
    isGitAccount?: boolean | undefined;
    isFacebookAccount?: boolean | undefined;
    isXAccount?: boolean | undefined;
    isAppleAccount?: boolean | undefined;
    isDiscordAccount?: boolean | undefined;
}, {
    expectedProfileVersion?: number | undefined;
    fullName?: string | undefined;
    username?: string | undefined;
    bio?: string | undefined;
    profileImg?: string | undefined;
    profileImgAlt?: string | undefined;
    coverBanner?: string | undefined;
    coverBannerAlt?: string | undefined;
    job?: string | undefined;
    portfolioUrl?: string | undefined;
    isGoogleAccount?: boolean | undefined;
    isGitAccount?: boolean | undefined;
    isFacebookAccount?: boolean | undefined;
    isXAccount?: boolean | undefined;
    isAppleAccount?: boolean | undefined;
    isDiscordAccount?: boolean | undefined;
}>;
export declare const updateProfileSocialSchema: z.ZodEffects<z.ZodObject<{
    linkedin: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    instagram: z.ZodOptional<z.ZodString>;
    github: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    youtube: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    expectedProfileVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    github?: string | undefined;
    expectedProfileVersion?: number | undefined;
    linkedin?: string | undefined;
    instagram?: string | undefined;
    youtube?: string | undefined;
}, {
    github?: string | undefined;
    expectedProfileVersion?: number | undefined;
    linkedin?: string | undefined;
    instagram?: string | undefined;
    youtube?: string | undefined;
}>, {
    github?: string | undefined;
    expectedProfileVersion?: number | undefined;
    linkedin?: string | undefined;
    instagram?: string | undefined;
    youtube?: string | undefined;
}, {
    github?: string | undefined;
    expectedProfileVersion?: number | undefined;
    linkedin?: string | undefined;
    instagram?: string | undefined;
    youtube?: string | undefined;
}>;
export declare const updateProfileStackSchema: z.ZodObject<{
    stackAndTools: z.ZodArray<z.ZodString, "many">;
    expectedProfileVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    stackAndTools: string[];
    expectedProfileVersion?: number | undefined;
}, {
    stackAndTools: string[];
    expectedProfileVersion?: number | undefined;
}>;
export declare const updateProfileWorkSchema: z.ZodObject<{
    workExperiences: z.ZodArray<z.ZodEffects<z.ZodObject<{
        workId: z.ZodOptional<z.ZodString>;
        jobTitle: z.ZodString;
        employmentType: z.ZodString;
        company: z.ZodString;
        companyDomain: z.ZodOptional<z.ZodString>;
        companyLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        companyLogoAlt: z.ZodOptional<z.ZodString>;
        currentPosition: z.ZodOptional<z.ZodBoolean>;
        startDate: z.ZodString;
        endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        location: z.ZodOptional<z.ZodString>;
        locationType: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        skills: z.ZodArray<z.ZodString, "many">;
        promotions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            jobTitle: z.ZodString;
            startDate: z.ZodOptional<z.ZodString>;
            endDate: z.ZodOptional<z.ZodString>;
            currentPosition: z.ZodOptional<z.ZodBoolean>;
            media: z.ZodOptional<z.ZodArray<z.ZodObject<{
                url: z.ZodString;
                title: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url: string;
                title?: string | undefined;
            }, {
                url: string;
                title?: string | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }, {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }>, "many">>;
        mediaUrls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            title?: string | undefined;
        }, {
            url: string;
            title?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }, {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }>, {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }, {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }>, "many">;
    expectedProfileVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    workExperiences: {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }[];
    expectedProfileVersion?: number | undefined;
}, {
    workExperiences: {
        jobTitle: string;
        startDate: string;
        employmentType: string;
        company: string;
        locationType: string;
        skills: string[];
        endDate?: string | null | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        promotions?: {
            jobTitle: string;
            startDate?: string | undefined;
            endDate?: string | undefined;
            currentPosition?: boolean | undefined;
            media?: {
                url: string;
                title?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        workId?: string | undefined;
        companyDomain?: string | undefined;
        companyLogo?: string | undefined;
        companyLogoAlt?: string | undefined;
        location?: string | undefined;
        description?: string | undefined;
        mediaUrls?: string[] | undefined;
    }[];
    expectedProfileVersion?: number | undefined;
}>;
export declare const updateProfileEducationSchema: z.ZodObject<{
    education: z.ZodArray<z.ZodEffects<z.ZodObject<{
        eduId: z.ZodOptional<z.ZodString>;
        school: z.ZodString;
        schoolDomain: z.ZodOptional<z.ZodString>;
        schoolLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        schoolLogoAlt: z.ZodOptional<z.ZodString>;
        degree: z.ZodString;
        fieldOfStudy: z.ZodOptional<z.ZodString>;
        currentEducation: z.ZodOptional<z.ZodBoolean>;
        startDate: z.ZodString;
        endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        grade: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        activity: z.ZodOptional<z.ZodString>;
        refCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }, {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }>, {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }, {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }>, "many">;
    expectedProfileVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    education: {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }[];
    expectedProfileVersion?: number | undefined;
}, {
    education: {
        startDate: string;
        school: string;
        degree: string;
        endDate?: string | null | undefined;
        description?: string | undefined;
        eduId?: string | undefined;
        schoolDomain?: string | undefined;
        schoolLogo?: string | undefined;
        schoolLogoAlt?: string | undefined;
        fieldOfStudy?: string | undefined;
        currentEducation?: boolean | undefined;
        grade?: string | undefined;
        activity?: string | undefined;
        refCode?: string | undefined;
    }[];
    expectedProfileVersion?: number | undefined;
}>;
export declare const updateProfileCertificationsSchema: z.ZodObject<{
    certifications: z.ZodArray<z.ZodObject<{
        certId: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        issuingOrganization: z.ZodString;
        issuerLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        issuerLogoAlt: z.ZodOptional<z.ZodString>;
        currentlyValid: z.ZodOptional<z.ZodBoolean>;
        issueDate: z.ZodString;
        expirationDate: z.ZodOptional<z.ZodString>;
        certValType: z.ZodOptional<z.ZodString>;
        credentialId: z.ZodOptional<z.ZodString>;
        credentialUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        description: z.ZodOptional<z.ZodString>;
        skills: z.ZodArray<z.ZodString, "many">;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            title?: string | undefined;
        }, {
            url: string;
            title?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        skills: string[];
        name: string;
        issuingOrganization: string;
        issueDate: string;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        certId?: string | undefined;
        issuerLogo?: string | undefined;
        issuerLogoAlt?: string | undefined;
        currentlyValid?: boolean | undefined;
        expirationDate?: string | undefined;
        certValType?: string | undefined;
        credentialId?: string | undefined;
        credentialUrl?: string | undefined;
    }, {
        skills: string[];
        name: string;
        issuingOrganization: string;
        issueDate: string;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        certId?: string | undefined;
        issuerLogo?: string | undefined;
        issuerLogoAlt?: string | undefined;
        currentlyValid?: boolean | undefined;
        expirationDate?: string | undefined;
        certValType?: string | undefined;
        credentialId?: string | undefined;
        credentialUrl?: string | undefined;
    }>, "many">;
    expectedProfileVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    certifications: {
        skills: string[];
        name: string;
        issuingOrganization: string;
        issueDate: string;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        certId?: string | undefined;
        issuerLogo?: string | undefined;
        issuerLogoAlt?: string | undefined;
        currentlyValid?: boolean | undefined;
        expirationDate?: string | undefined;
        certValType?: string | undefined;
        credentialId?: string | undefined;
        credentialUrl?: string | undefined;
    }[];
    expectedProfileVersion?: number | undefined;
}, {
    certifications: {
        skills: string[];
        name: string;
        issuingOrganization: string;
        issueDate: string;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        certId?: string | undefined;
        issuerLogo?: string | undefined;
        issuerLogoAlt?: string | undefined;
        currentlyValid?: boolean | undefined;
        expirationDate?: string | undefined;
        certValType?: string | undefined;
        credentialId?: string | undefined;
        credentialUrl?: string | undefined;
    }[];
    expectedProfileVersion?: number | undefined;
}>;
export declare const updateProfileProjectsSchema: z.ZodEffects<z.ZodObject<{
    projects: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodDefault<z.ZodEnum<["project", "publication"]>>;
        source: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"github">, z.ZodLiteral<"">]>>;
        repoFullName: z.ZodOptional<z.ZodString>;
        repoId: z.ZodOptional<z.ZodNumber>;
        title: z.ZodString;
        publisher: z.ZodOptional<z.ZodString>;
        ongoing: z.ZodOptional<z.ZodBoolean>;
        publicationDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        publicationUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        description: z.ZodOptional<z.ZodString>;
        prjLog: z.ZodOptional<z.ZodString>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            title?: string | undefined;
        }, {
            url: string;
            title?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        type: "project" | "publication";
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }, {
        title: string;
        type?: "project" | "publication" | undefined;
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }>, {
        title: string;
        type: "project" | "publication";
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }, {
        title: string;
        type?: "project" | "publication" | undefined;
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }>, "many">, {
        title: string;
        type: "project" | "publication";
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[], {
        title: string;
        type?: "project" | "publication" | undefined;
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[]>>;
    openSourceContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        repository: z.ZodOptional<z.ZodString>;
        repositoryUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        active: z.ZodOptional<z.ZodBoolean>;
        activeFrom: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }, {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }>, "many">>;
    isGitAccount: z.ZodOptional<z.ZodBoolean>;
    expectedProfileVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    expectedProfileVersion?: number | undefined;
    projects?: {
        title: string;
        type: "project" | "publication";
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[] | undefined;
    openSourceContributions?: {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }[] | undefined;
    isGitAccount?: boolean | undefined;
}, {
    expectedProfileVersion?: number | undefined;
    projects?: {
        title: string;
        type?: "project" | "publication" | undefined;
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[] | undefined;
    openSourceContributions?: {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }[] | undefined;
    isGitAccount?: boolean | undefined;
}>, {
    expectedProfileVersion?: number | undefined;
    projects?: {
        title: string;
        type: "project" | "publication";
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[] | undefined;
    openSourceContributions?: {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }[] | undefined;
    isGitAccount?: boolean | undefined;
}, {
    expectedProfileVersion?: number | undefined;
    projects?: {
        title: string;
        type?: "project" | "publication" | undefined;
        endDate?: string | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
        description?: string | undefined;
        source?: "" | "github" | undefined;
        repoFullName?: string | undefined;
        repoId?: number | undefined;
        publisher?: string | undefined;
        ongoing?: boolean | undefined;
        publicationDate?: string | undefined;
        publicationUrl?: string | undefined;
        prjLog?: string | undefined;
    }[] | undefined;
    openSourceContributions?: {
        title: string;
        endDate?: string | undefined;
        description?: string | undefined;
        repository?: string | undefined;
        repositoryUrl?: string | undefined;
        active?: boolean | undefined;
        activeFrom?: string | undefined;
    }[] | undefined;
    isGitAccount?: boolean | undefined;
}>;
export declare const updateProfileSetupSchema: z.ZodObject<{
    mySetup: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        imageUrl: z.ZodString;
        productUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        imageAlt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        imageUrl: string;
        productUrl?: string | undefined;
        imageAlt?: string | undefined;
    }, {
        label: string;
        imageUrl: string;
        productUrl?: string | undefined;
        imageAlt?: string | undefined;
    }>, "many">;
    expectedProfileVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    mySetup: {
        label: string;
        imageUrl: string;
        productUrl?: string | undefined;
        imageAlt?: string | undefined;
    }[];
    expectedProfileVersion?: number | undefined;
}, {
    mySetup: {
        label: string;
        imageUrl: string;
        productUrl?: string | undefined;
        imageAlt?: string | undefined;
    }[];
    expectedProfileVersion?: number | undefined;
}>;
/** Legacy names (previously Joi schemas). */
export declare const workExperienceItem: z.ZodEffects<z.ZodObject<{
    workId: z.ZodOptional<z.ZodString>;
    jobTitle: z.ZodString;
    employmentType: z.ZodString;
    company: z.ZodString;
    companyDomain: z.ZodOptional<z.ZodString>;
    companyLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    companyLogoAlt: z.ZodOptional<z.ZodString>;
    currentPosition: z.ZodOptional<z.ZodBoolean>;
    startDate: z.ZodString;
    endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    location: z.ZodOptional<z.ZodString>;
    locationType: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    skills: z.ZodArray<z.ZodString, "many">;
    promotions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        jobTitle: z.ZodString;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        currentPosition: z.ZodOptional<z.ZodBoolean>;
        media: z.ZodOptional<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            title?: string | undefined;
        }, {
            url: string;
            title?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }, {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }>, "many">>;
    mediaUrls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        title?: string | undefined;
    }, {
        url: string;
        title?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    jobTitle: string;
    startDate: string;
    employmentType: string;
    company: string;
    locationType: string;
    skills: string[];
    endDate?: string | null | undefined;
    currentPosition?: boolean | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    promotions?: {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }[] | undefined;
    workId?: string | undefined;
    companyDomain?: string | undefined;
    companyLogo?: string | undefined;
    companyLogoAlt?: string | undefined;
    location?: string | undefined;
    description?: string | undefined;
    mediaUrls?: string[] | undefined;
}, {
    jobTitle: string;
    startDate: string;
    employmentType: string;
    company: string;
    locationType: string;
    skills: string[];
    endDate?: string | null | undefined;
    currentPosition?: boolean | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    promotions?: {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }[] | undefined;
    workId?: string | undefined;
    companyDomain?: string | undefined;
    companyLogo?: string | undefined;
    companyLogoAlt?: string | undefined;
    location?: string | undefined;
    description?: string | undefined;
    mediaUrls?: string[] | undefined;
}>, {
    jobTitle: string;
    startDate: string;
    employmentType: string;
    company: string;
    locationType: string;
    skills: string[];
    endDate?: string | null | undefined;
    currentPosition?: boolean | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    promotions?: {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }[] | undefined;
    workId?: string | undefined;
    companyDomain?: string | undefined;
    companyLogo?: string | undefined;
    companyLogoAlt?: string | undefined;
    location?: string | undefined;
    description?: string | undefined;
    mediaUrls?: string[] | undefined;
}, {
    jobTitle: string;
    startDate: string;
    employmentType: string;
    company: string;
    locationType: string;
    skills: string[];
    endDate?: string | null | undefined;
    currentPosition?: boolean | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    promotions?: {
        jobTitle: string;
        startDate?: string | undefined;
        endDate?: string | undefined;
        currentPosition?: boolean | undefined;
        media?: {
            url: string;
            title?: string | undefined;
        }[] | undefined;
    }[] | undefined;
    workId?: string | undefined;
    companyDomain?: string | undefined;
    companyLogo?: string | undefined;
    companyLogoAlt?: string | undefined;
    location?: string | undefined;
    description?: string | undefined;
    mediaUrls?: string[] | undefined;
}>;
export declare const educationItem: z.ZodEffects<z.ZodObject<{
    eduId: z.ZodOptional<z.ZodString>;
    school: z.ZodString;
    schoolDomain: z.ZodOptional<z.ZodString>;
    schoolLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    schoolLogoAlt: z.ZodOptional<z.ZodString>;
    degree: z.ZodString;
    fieldOfStudy: z.ZodOptional<z.ZodString>;
    currentEducation: z.ZodOptional<z.ZodBoolean>;
    startDate: z.ZodString;
    endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    grade: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activity: z.ZodOptional<z.ZodString>;
    refCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    startDate: string;
    school: string;
    degree: string;
    endDate?: string | null | undefined;
    description?: string | undefined;
    eduId?: string | undefined;
    schoolDomain?: string | undefined;
    schoolLogo?: string | undefined;
    schoolLogoAlt?: string | undefined;
    fieldOfStudy?: string | undefined;
    currentEducation?: boolean | undefined;
    grade?: string | undefined;
    activity?: string | undefined;
    refCode?: string | undefined;
}, {
    startDate: string;
    school: string;
    degree: string;
    endDate?: string | null | undefined;
    description?: string | undefined;
    eduId?: string | undefined;
    schoolDomain?: string | undefined;
    schoolLogo?: string | undefined;
    schoolLogoAlt?: string | undefined;
    fieldOfStudy?: string | undefined;
    currentEducation?: boolean | undefined;
    grade?: string | undefined;
    activity?: string | undefined;
    refCode?: string | undefined;
}>, {
    startDate: string;
    school: string;
    degree: string;
    endDate?: string | null | undefined;
    description?: string | undefined;
    eduId?: string | undefined;
    schoolDomain?: string | undefined;
    schoolLogo?: string | undefined;
    schoolLogoAlt?: string | undefined;
    fieldOfStudy?: string | undefined;
    currentEducation?: boolean | undefined;
    grade?: string | undefined;
    activity?: string | undefined;
    refCode?: string | undefined;
}, {
    startDate: string;
    school: string;
    degree: string;
    endDate?: string | null | undefined;
    description?: string | undefined;
    eduId?: string | undefined;
    schoolDomain?: string | undefined;
    schoolLogo?: string | undefined;
    schoolLogoAlt?: string | undefined;
    fieldOfStudy?: string | undefined;
    currentEducation?: boolean | undefined;
    grade?: string | undefined;
    activity?: string | undefined;
    refCode?: string | undefined;
}>;
export declare const certificationItem: z.ZodObject<{
    certId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    issuingOrganization: z.ZodString;
    issuerLogo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    issuerLogoAlt: z.ZodOptional<z.ZodString>;
    currentlyValid: z.ZodOptional<z.ZodBoolean>;
    issueDate: z.ZodString;
    expirationDate: z.ZodOptional<z.ZodString>;
    certValType: z.ZodOptional<z.ZodString>;
    credentialId: z.ZodOptional<z.ZodString>;
    credentialUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    description: z.ZodOptional<z.ZodString>;
    skills: z.ZodArray<z.ZodString, "many">;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        title?: string | undefined;
    }, {
        url: string;
        title?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    skills: string[];
    name: string;
    issuingOrganization: string;
    issueDate: string;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    certId?: string | undefined;
    issuerLogo?: string | undefined;
    issuerLogoAlt?: string | undefined;
    currentlyValid?: boolean | undefined;
    expirationDate?: string | undefined;
    certValType?: string | undefined;
    credentialId?: string | undefined;
    credentialUrl?: string | undefined;
}, {
    skills: string[];
    name: string;
    issuingOrganization: string;
    issueDate: string;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    certId?: string | undefined;
    issuerLogo?: string | undefined;
    issuerLogoAlt?: string | undefined;
    currentlyValid?: boolean | undefined;
    expirationDate?: string | undefined;
    certValType?: string | undefined;
    credentialId?: string | undefined;
    credentialUrl?: string | undefined;
}>;
export declare const projectItem: z.ZodEffects<z.ZodObject<{
    type: z.ZodDefault<z.ZodEnum<["project", "publication"]>>;
    source: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"github">, z.ZodLiteral<"">]>>;
    repoFullName: z.ZodOptional<z.ZodString>;
    repoId: z.ZodOptional<z.ZodNumber>;
    title: z.ZodString;
    publisher: z.ZodOptional<z.ZodString>;
    ongoing: z.ZodOptional<z.ZodBoolean>;
    publicationDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    publicationUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    description: z.ZodOptional<z.ZodString>;
    prjLog: z.ZodOptional<z.ZodString>;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        title?: string | undefined;
    }, {
        url: string;
        title?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    type: "project" | "publication";
    endDate?: string | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    source?: "" | "github" | undefined;
    repoFullName?: string | undefined;
    repoId?: number | undefined;
    publisher?: string | undefined;
    ongoing?: boolean | undefined;
    publicationDate?: string | undefined;
    publicationUrl?: string | undefined;
    prjLog?: string | undefined;
}, {
    title: string;
    type?: "project" | "publication" | undefined;
    endDate?: string | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    source?: "" | "github" | undefined;
    repoFullName?: string | undefined;
    repoId?: number | undefined;
    publisher?: string | undefined;
    ongoing?: boolean | undefined;
    publicationDate?: string | undefined;
    publicationUrl?: string | undefined;
    prjLog?: string | undefined;
}>, {
    title: string;
    type: "project" | "publication";
    endDate?: string | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    source?: "" | "github" | undefined;
    repoFullName?: string | undefined;
    repoId?: number | undefined;
    publisher?: string | undefined;
    ongoing?: boolean | undefined;
    publicationDate?: string | undefined;
    publicationUrl?: string | undefined;
    prjLog?: string | undefined;
}, {
    title: string;
    type?: "project" | "publication" | undefined;
    endDate?: string | undefined;
    media?: {
        url: string;
        title?: string | undefined;
    }[] | undefined;
    description?: string | undefined;
    source?: "" | "github" | undefined;
    repoFullName?: string | undefined;
    repoId?: number | undefined;
    publisher?: string | undefined;
    ongoing?: boolean | undefined;
    publicationDate?: string | undefined;
    publicationUrl?: string | undefined;
    prjLog?: string | undefined;
}>;
export declare const openSourceItem: z.ZodObject<{
    title: z.ZodString;
    repository: z.ZodOptional<z.ZodString>;
    repositoryUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    active: z.ZodOptional<z.ZodBoolean>;
    activeFrom: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    endDate?: string | undefined;
    description?: string | undefined;
    repository?: string | undefined;
    repositoryUrl?: string | undefined;
    active?: boolean | undefined;
    activeFrom?: string | undefined;
}, {
    title: string;
    endDate?: string | undefined;
    description?: string | undefined;
    repository?: string | undefined;
    repositoryUrl?: string | undefined;
    active?: boolean | undefined;
    activeFrom?: string | undefined;
}>;
export declare const setupItem: z.ZodObject<{
    label: z.ZodString;
    imageUrl: z.ZodString;
    productUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    imageAlt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    imageUrl: string;
    productUrl?: string | undefined;
    imageAlt?: string | undefined;
}, {
    label: string;
    imageUrl: string;
    productUrl?: string | undefined;
    imageAlt?: string | undefined;
}>;
//# sourceMappingURL=profileZodSchemas.d.ts.map