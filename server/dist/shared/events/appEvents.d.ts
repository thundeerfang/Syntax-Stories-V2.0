import type { Request } from 'express';
import type { ProfileSections, ProfileUpdateSection } from '../../modules/profile/profile.types.js';
/**
 * In-process event bus (not Kafka). Listeners must not block the request path for heavy work.
 * Async listeners are fire-and-forget; errors are logged only.
 */
export type AuthSigninSuccessPayload = {
    userId: string;
    /** e.g. `google`, `otp`, `signup_email`, `2fa`, `qr_login` */
    source: string;
    isNewUser?: boolean;
};
/** Emitted after a successful profile persist; audit listener diffs sections. */
export type ReferralConvertedPayload = {
    referrerId: string;
    refereeUserId: string;
    source: string;
};
export type ProfileUpdatedPayload = {
    req: Request;
    actorId: string;
    updates: Record<string, unknown>;
    currentProfile: ProfileSections | null;
    updatedProfile: ProfileSections & {
        _id: unknown;
    };
    /** `legacy` = monolithic `PATCH /auth/profile`; otherwise the section route used. */
    section: ProfileUpdateSection | 'legacy';
};
export type AppEventMap = {
    /** Successful sign-in after session + JWT issuance (email OTP, OAuth, etc.). */
    'auth.signin.success': AuthSigninSuccessPayload;
    /** Referral attributed on new user (post-DB conditional update). */
    'referral.converted': ReferralConvertedPayload;
    /** Profile document updated (post-DB write). */
    'profile.updated': ProfileUpdatedPayload;
};
type Listener<K extends keyof AppEventMap> = (payload: AppEventMap[K]) => void | Promise<void>;
export declare function onAppEvent<K extends keyof AppEventMap>(event: K, fn: Listener<K>): () => void;
export declare function emitAppEvent<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void;
export {};
//# sourceMappingURL=appEvents.d.ts.map