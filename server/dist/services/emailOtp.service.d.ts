import type { Response } from 'express';
export type EmailOtpPurpose = 'login' | 'signup';
/** HMAC-SHA256 hex — raw OTP never stored in Redis. */
export declare function hashEmailOtp(emailNorm: string, code: string): string;
export declare function verifyEmailOtpHash(storedHex: string, emailNorm: string, code: string): boolean;
export declare function generateEmailOtpDigits(): string;
export interface StoredLoginOtp {
    h: string;
    /** Monotonic per send; omit on legacy keys. */
    v?: number;
}
export interface StoredSignupOtp {
    h: string;
    fullName: string;
    v?: number;
}
export declare function storeEmailOtpLogin(emailNorm: string, code: string): Promise<number>;
export declare function storeEmailOtpSignup(emailNorm: string, code: string, fullName: string): Promise<number>;
export declare function getStoredLoginOtp(emailNorm: string): Promise<StoredLoginOtp | null>;
export declare function getStoredSignupOtp(emailNorm: string): Promise<StoredSignupOtp | null>;
export declare function deleteEmailOtp(purpose: EmailOtpPurpose, emailNorm: string): Promise<void>;
/** Avoid stale dual challenges: only one purpose active per email at a time. */
export declare function invalidateOppositeEmailOtp(purpose: EmailOtpPurpose, emailNorm: string): Promise<void>;
/**
 * Block rapid resend: same email+purpose cannot trigger a new code within OTP_MIN_RESEND_SECONDS.
 * Call before registerEmailOtpSendOrReject and before generating a new code.
 */
export declare function assertOtpMinResendOrReject(purpose: EmailOtpPurpose, normalizedEmail: string, res: Response): Promise<boolean>;
/** After email send succeeds. */
export declare function markOtpResendGate(purpose: EmailOtpPurpose, normalizedEmail: string): Promise<void>;
/**
 * Per-email send budget + escalating cooldown. Call only when you will actually send a new code.
 */
export declare function registerEmailOtpSendOrReject(normalizedEmail: string, res: Response): Promise<boolean>;
/** If stored OTP has a version, client must send the same otpVersion or verification fails (stale code after resend). */
export declare function isOtpVersionMismatch(stored: StoredLoginOtp | StoredSignupOtp, otpVersion: number | undefined): boolean;
//# sourceMappingURL=emailOtp.service.d.ts.map