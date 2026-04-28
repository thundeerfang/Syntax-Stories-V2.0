/**
 * Single source of truth for Redis key shapes. Always build keys through this module
 * so namespaces stay consistent and grep-friendly.
 *
 * Prefixes are preserved for backward compatibility with existing deployments
 * (e.g. OAuth link nonces remain `link:*`, not renamed).
 */
export const redisKeys = {
    oauth: {
        /** Ephemeral account-link nonce; value is userId string. */
        link: (linkKey) => `link:${linkKey}`,
        /** One-time OAuth browser callback; value is JSON payload (tokens, userId). TTL ~90s. */
        exchange: (code) => `oauth:exchange:${code}`,
    },
    auth: {
        intent: (tokenHash) => `intent:user:${tokenHash}`,
        twoFactorSetup: (userId) => `2fa:setup:${userId}`,
        qrLogin: (qrToken) => `qr:login:${qrToken}`,
        emailChange: (userId) => `emailchange:${userId}`,
        otpAttempts: (normalizedEmail) => `otp:attempts:${normalizedEmail}`,
    },
    /** 2FA step-up challenge (hashed token → JSON payload). */
    challenge: (tokenHash) => `auth:challenge:${tokenHash}`,
    otp: {
        storage: (purpose, emailNorm) => purpose === 'login' ? `otp:login:${emailNorm}` : `otp:signup:${emailNorm}`,
        resendGate: (purpose, emailNorm) => `otp:resend:${purpose}:${emailNorm}`,
        codeVer: (purpose, emailNorm) => `otp:codeVer:${purpose}:${emailNorm}`,
        sendLock: (normalizedEmail) => `otp:send:lock:${normalizedEmail}`,
        sendCount: (normalizedEmail) => `otp:send:count:${normalizedEmail}`,
        sendStrike: (normalizedEmail) => `otp:send:strike:${normalizedEmail}`,
    },
    idempotency: (clientKey) => `idem:${clientKey}`,
    analytics: {
        profileOverview: (usernameLower) => `profile:analytics:${usernameLower}`,
        profileTimeseries: (usernameLower) => `profile:analytics:${usernameLower}:timeseries`,
        rateLimitProfileView: (ip) => `rl:analytics:profile-view:${ip}`,
    },
    follow: {
        dailyCap: (userId, dayKey) => `cap:follow:${userId}:${dayKey}`,
    },
    invite: {
        /** Referrer ObjectId string, or sentinel `__NONE__` for negative cache. */
        codeCache: (normalizedCode) => `invite:code:${normalizedCode}`,
        /** OAuth signup: nonce → normalized referral code (TTL ~10m). */
        oauthSignupNonce: (nonce) => `invite:oauth:signup:${nonce}`,
    },
    /**
     * Auth HTTP rate limits via RedisRateLimitStore.
     * Full key = `authRateLimitKey(prefix, suffix)` where `suffix` comes from express-rate-limit’s keyGenerator.
     */
    rateLimit: {
        sendOtp: 'rl:sendotp:',
        verifyOtp: 'rl:verifyotp:',
        signupEmail: 'rl:signupemail:',
        refresh: 'rl:refresh:',
        updateProfile: 'rl:updateprofile:',
        feedback: 'rl:feedback:',
        inviteResolve: 'rl:invite:resolve:',
        authHttpKey: (prefix, keySuffix) => `${prefix}${keySuffix}`,
    },
};
//# sourceMappingURL=keys.js.map