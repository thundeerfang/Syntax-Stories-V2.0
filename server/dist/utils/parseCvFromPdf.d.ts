/**
 * Parse CV/Resume text extracted from PDF and return structured profile data
 * plus a list of missing field keys for the frontend to prompt the user.
 */
export type ExtractedProfile = {
    bio?: string;
    linkedin?: string;
    github?: string;
    stackAndTools?: string[];
    workExperiences?: Array<{
        jobTitle: string;
        company: string;
        employmentType?: string;
        currentPosition?: boolean;
        startDate?: string;
        endDate?: string;
        location?: string;
        locationType?: string;
        description?: string;
        skills?: string[];
    }>;
    education?: Array<{
        school: string;
        degree: string;
        fieldOfStudy?: string;
        currentEducation?: boolean;
        startDate?: string;
        endDate?: string;
        grade?: string;
        description?: string;
    }>;
    certifications?: Array<{
        name: string;
        issuingOrganization: string;
        issueDate?: string;
        expirationDate?: string;
        credentialId?: string;
        credentialUrl?: string;
        description?: string;
    }>;
};
export type MissingFieldKey = 'bio' | 'linkedin' | 'github' | 'stackAndTools' | 'workExperiences' | 'education' | 'certifications';
/** Per-item hints for the frontend: which fields to ask the user to add (e.g. project missing publicationDate). */
export type IncompleteItemHints = {
    workExperiences?: Array<{
        index: number;
        title?: string;
        missing: string[];
    }>;
    education?: Array<{
        index: number;
        title?: string;
        missing: string[];
    }>;
    certifications?: Array<{
        index: number;
        title?: string;
        missing: string[];
    }>;
};
export declare function parseCvFromText(text: string): {
    extracted: ExtractedProfile;
    missingFields: MissingFieldKey[];
    incompleteItemHints: IncompleteItemHints;
};
//# sourceMappingURL=parseCvFromPdf.d.ts.map