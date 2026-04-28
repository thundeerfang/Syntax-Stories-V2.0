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
    link: (linkKey: string) => `link:${linkKey}`,
    /** One-time OAuth browser callback; value is JSON payload (tokens, userId). TTL ~90s. */
    exchange: (code: string) => `oauth:exchange:${code}`,
  },

  /** Invite / referral: OAuth signup nonce → referral code; code → referrer userId cache. */
  invite: {
    oauthSignupNonce: (nonce: string) => `invite:oauth-signup:${nonce}`,
    codeCache: (normalizedCode: string) => `invite:code:${normalizedCode}`,
  },

  auth: {
    intent: (tokenHash: string) => `intent:user:${tokenHash}`,
    twoFactorSetup: (userId: string) => `2fa:setup:${userId}`,
    qrLogin: (qrToken: string) => `qr:login:${qrToken}`,
    emailChange: (userId: string) => `emailchange:${userId}`,
    otpAttempts: (normalizedEmail: string) => `otp:attempts:${normalizedEmail}`,
  },

  /** 2FA step-up challenge (hashed token → JSON payload). */
  challenge: (tokenHash: string) => `auth:challenge:${tokenHash}`,

  otp: {
    storage: (purpose: 'login' | 'signup', emailNorm: string) =>
      purpose === 'login' ? `otp:login:${emailNorm}` : `otp:signup:${emailNorm}`,
    resendGate: (purpose: 'login' | 'signup', emailNorm: string) =>
      `otp:resend:${purpose}:${emailNorm}`,
    codeVer: (purpose: 'login' | 'signup', emailNorm: string) =>
      `otp:codeVer:${purpose}:${emailNorm}`,
    sendLock: (normalizedEmail: string) => `otp:send:lock:${normalizedEmail}`,
    sendCount: (normalizedEmail: string) => `otp:send:count:${normalizedEmail}`,
    sendStrike: (normalizedEmail: string) => `otp:send:strike:${normalizedEmail}`,
  },

  idempotency: (clientKey: string) => `idem:${clientKey}`,

  analytics: {
    profileOverview: (usernameLower: string) => `profile:analytics:${usernameLower}`,
    profileTimeseries: (usernameLower: string) =>
      `profile:analytics:${usernameLower}:timeseries`,
    rateLimitProfileView: (ip: string) => `rl:analytics:profile-view:${ip}`,
  },

  follow: {
    dailyCap: (userId: string, dayKey: string) => `cap:follow:${userId}:${dayKey}`,
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
    inviteResolve: 'rl:invite-resolve:',
    authHttpKey: (prefix: string, keySuffix: string) => `${prefix}${keySuffix}`,
  },
} as const;
