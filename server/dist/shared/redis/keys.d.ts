/**
 * Single source of truth for Redis key shapes. Always build keys through this module
 * so namespaces stay consistent and grep-friendly.
 *
 * Prefixes are preserved for backward compatibility with existing deployments
 * (e.g. OAuth link nonces remain `link:*`, not renamed).
 */
export declare const redisKeys: {
    readonly oauth: {
        /** Ephemeral account-link nonce; value is userId string. */
        readonly link: (linkKey: string) => string;
        /** One-time OAuth browser callback; value is JSON payload (tokens, userId). TTL ~90s. */
        readonly exchange: (code: string) => string;
    };
    readonly auth: {
        readonly intent: (tokenHash: string) => string;
        readonly twoFactorSetup: (userId: string) => string;
        readonly qrLogin: (qrToken: string) => string;
        readonly emailChange: (userId: string) => string;
        readonly otpAttempts: (normalizedEmail: string) => string;
    };
    /** 2FA step-up challenge (hashed token → JSON payload). */
    readonly challenge: (tokenHash: string) => string;
    readonly otp: {
        readonly storage: (purpose: "login" | "signup", emailNorm: string) => string;
        readonly resendGate: (purpose: "login" | "signup", emailNorm: string) => string;
        readonly codeVer: (purpose: "login" | "signup", emailNorm: string) => string;
        readonly sendLock: (normalizedEmail: string) => string;
        readonly sendCount: (normalizedEmail: string) => string;
        readonly sendStrike: (normalizedEmail: string) => string;
    };
    readonly idempotency: (clientKey: string) => string;
    readonly analytics: {
        readonly profileOverview: (usernameLower: string) => string;
        readonly profileTimeseries: (usernameLower: string) => string;
        readonly rateLimitProfileView: (ip: string) => string;
    };
    readonly follow: {
        readonly dailyCap: (userId: string, dayKey: string) => string;
    };
    readonly invite: {
        /** Referrer ObjectId string, or sentinel `__NONE__` for negative cache. */
        readonly codeCache: (normalizedCode: string) => string;
        /** OAuth signup: nonce → normalized referral code (TTL ~10m). */
        readonly oauthSignupNonce: (nonce: string) => string;
    };
    /**
     * Auth HTTP rate limits via RedisRateLimitStore.
     * Full key = `authRateLimitKey(prefix, suffix)` where `suffix` comes from express-rate-limit’s keyGenerator.
     */
    readonly rateLimit: {
        readonly sendOtp: "rl:sendotp:";
        readonly verifyOtp: "rl:verifyotp:";
        readonly signupEmail: "rl:signupemail:";
        readonly refresh: "rl:refresh:";
        readonly updateProfile: "rl:updateprofile:";
        readonly feedback: "rl:feedback:";
        readonly inviteResolve: "rl:invite:resolve:";
        readonly authHttpKey: (prefix: string, keySuffix: string) => string;
    };
};
//# sourceMappingURL=keys.d.ts.map