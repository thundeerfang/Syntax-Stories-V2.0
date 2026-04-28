import type { Request } from 'express';
import type { AuthUser } from '../../middlewares/auth/index.js';
import type { ProfileUpdateSection } from './profile.types.js';
export type ProfileServiceError = {
    status: number;
    message: string;
    code?: string;
};
export type ProfileUpdateOk = {
    ok: true;
    user: Record<string, unknown>;
};
export type ProfileUpdateFail = {
    ok: false;
    status: number;
    message: string;
    code?: string;
};
export type ProfileUpdateResult = ProfileUpdateOk | ProfileUpdateFail;
export declare const profileService: {
    getMe(userId: string): Promise<ProfileUpdateResult>;
    updateProfile(req: Request, user: AuthUser, body: Record<string, unknown>): Promise<ProfileUpdateResult>;
    updateProfileSection(req: Request, user: AuthUser, section: ProfileUpdateSection, body: Record<string, unknown>): Promise<ProfileUpdateResult>;
    parseCvFromPdfBuffer(buffer: Buffer): Promise<{
        extracted: Record<string, unknown>;
        missingFields: string[];
        incompleteItemHints: Record<string, unknown>;
    }>;
};
//# sourceMappingURL=profile.service.d.ts.map