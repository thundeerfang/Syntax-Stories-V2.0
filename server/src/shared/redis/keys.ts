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

  /** Read-streak hot cache (Mongo remains SoT; see `readStreakRedis.ts`, BLOG_READ_STREAK.md). */
  readStreak: {
    dailyHash: (userId: string) => `user:${userId}:streak:daily`,
    readDaysZset: (userId: string) => `user:${userId}:readDays`,
    viewSession: (sessionId: string) => `read:session:${sessionId}`,
    viewCommitAck: (userId: string, sessionId: string) => `read:view_commit_ack:${userId}:${sessionId}`,
    /** F.2 — per-user rolling minute bucket for VIEW_START spam control. */
    viewStartRateLimit: (userId: string, minuteEpoch: number) => `rl:read:start:${userId}:${minuteEpoch}`,
  },

  invite: {
    /** Referrer ObjectId string, or sentinel `__NONE__` for negative cache. */
    codeCache: (normalizedCode: string) => `invite:code:${normalizedCode}`,
    /** OAuth signup: nonce → normalized referral code (TTL ~10m). */
    oauthSignupNonce: (nonce: string) => `invite:oauth:signup:${nonce}`,
  },

  /**
   * Auth HTTP rate limits via RedisRateLimitStore.
   * Full key = `authRateLimitKey(prefix, suffix)` where `suffix` comes from express-rate-limit’s keyGenerator.
   */
  rateLimit: {
    sendOtp: 'rl:sendotp:',
    verifyOtp: 'rl:verifyotp:',
    staffLogin: 'rl:stafflogin:',
    signupEmail: 'rl:signupemail:',
    refresh: 'rl:refresh:',
    updateProfile: 'rl:updateprofile:',
    feedback: 'rl:feedback:',
    contact: 'rl:contact:',
    inviteResolve: 'rl:invite:resolve:',
    createCheckout: 'rl:billing:checkout:',
    verifyCheckout: 'rl:billing:verify:',
    authHttpKey: (prefix: string, keySuffix: string) => `${prefix}${keySuffix}`,
  },

  billing: {
    webhookDedup: (eventId: string) => `stripe:wh:${eventId}`,
    subscriptionSummary: (userId: string) => `subscription:summary:${userId}`,
    billingLock: (stripeSubscriptionId: string) => `lock:billing:${stripeSubscriptionId}`,
  },

  /** Resolved permission set for staff user (JSON string[]); invalidate on role assignment change. */
  adminPerms: (staffUserId: string) => `admin:perms:${staffUserId}`,

  /**
   * Blog post stats: Pub/Sub channel per post (`blog:stats:<postId>`) + Redis list outbox for workers.
   * Payload shape: `docs/BLOG_REALTIME_STATS.md`.
   */
  blog: {
    statsChannel: (postId: string) => `blog:stats:${postId}`,
    statsOutbox: 'blog:stats:outbox',
  },
} as const;
