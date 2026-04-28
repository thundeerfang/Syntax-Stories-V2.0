import type { Request } from 'express';
import { type HydratedDocument } from 'mongoose';
import { type IUser } from '../models/User.js';
/** Normalize and validate referral codes before any DB access. */
export declare function normalizeReferralCode(raw: unknown): string | null;
export declare function parseSignupOAuthNonceFromState(state: unknown): string | null;
/**
 * Single resolver: body → signed cookie → OAuth signup nonce (Redis).
 * Fail-open on Redis (§3.1).
 */
export declare function resolveReferralInput(req: Request): Promise<string | null>;
export type ReferralDisplayDto = {
    valid: true;
    username: string;
    fullName: string;
    profileImg: string;
};
export declare function resolveCodeForDisplay(code: string): Promise<ReferralDisplayDto | {
    valid: false;
}>;
export declare function lookupReferrerIdByCode(code: string): Promise<string | null>;
/** IMPORTANT: invalidate Redis cache on referralCode change (regenerate / admin fix). */
export declare function invalidateReferralCodeCache(normalizedCode: string): Promise<void>;
export declare function ensureReferralCodeForUser(userId: string): Promise<string>;
export type ApplyReferralArgs = {
    req: Request;
    newUser: HydratedDocument<IUser>;
    refCode: string | null;
    source?: string;
};
export declare function applyReferralOnNewUser(args: ApplyReferralArgs): Promise<void>;
export declare const REFERRAL_COOKIE: {
    readonly name: "ss_ref";
    readonly maxMs: number;
};
export declare function buildSignedReferralCookieValue(code: string): string | null;
//# sourceMappingURL=referral.service.d.ts.map