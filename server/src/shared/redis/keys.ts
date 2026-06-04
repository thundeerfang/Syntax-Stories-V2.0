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
    passkeyRegister: (userId: string) => `passkey:reg:${userId}`,
    passkeyStepUp: (sessionId: string) => `passkey:stepup:${sessionId}`,
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
    profileTimeseries: (usernameLower: string) => `profile:analytics:${usernameLower}:timeseries`,
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
    viewCommitAck: (userId: string, sessionId: string) =>
      `read:view_commit_ack:${userId}:${sessionId}`,
    /** F.2 — per-user rolling minute bucket for VIEW_START spam control. */
    viewStartRateLimit: (userId: string, minuteEpoch: number) =>
      `rl:read:start:${userId}:${minuteEpoch}`,
  },

  invite: {
    /** Referrer ObjectId string, or sentinel `__NONE__` for negative cache. */
    codeCache: (normalizedCode: string) => `invite:code:${normalizedCode}`,
    /** OAuth signup: nonce → normalized referral code (TTL ~10m). */
    oauthSignupNonce: (nonce: string) => `invite:oauth:signup:${nonce}`,
    /** Top inviters by verified conversions (ZSET). */
    leaderboard: 'referral:leaderboard',
    /** Short-TTL dashboard stats JSON per referrer. */
    userStats: (userId: string) => `referral:user:${userId}:stats`,
    fraudDevice: (deviceHash: string) => `referral:fraud:device:${deviceHash}`,
  },

  /**
   * Auth HTTP rate limits via RedisRateLimitStore.
   * Full key = `authRateLimitKey(prefix, suffix)` where `suffix` comes from express-rate-limit’s keyGenerator.
   */
  adminInvite: {
    otp: (emailNorm: string) => `admin:invite:otp:${emailNorm}`,
    otpVersion: (emailNorm: string) => `admin:invite:otpVer:${emailNorm}`,
    verified: (token: string) => `admin:invite:verified:${token}`,
  },

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

  iam: {
    permissionSnapshot: (sessionId: string) => `iam:snapshot:${sessionId}`,
    permissionVersion: (userId: string) => `iam:permver:${userId}`,
    permissionInvalidateChannel: 'iam.permission.invalidate',
    stepUp: (sessionId: string) => `iam:stepup:${sessionId}`,
    adminBootAck: (sessionId: string) => `iam:adminboot:${sessionId}`,
    adminStepUpGrace: (sessionId: string) => `iam:adminstepup:grace:${sessionId}`,
    impersonation: (sessionId: string) => `iam:impersonate:${sessionId}`,
    sessionRisk: (sessionId: string) => `iam:risk:${sessionId}`,
    metrics: 'iam:metrics',
  },

  queues: {
    authEmail: 'queues:auth-email',
  },

  streams: {
    audit: 'stream:audit',
    security: 'stream:security',
    auth: 'stream:auth',
    achievements: 'stream:achievements',
    /** Unified gamification stream (achievements + referrals + rewards). */
    gamification: 'stream:gamification',
  },

  /**
   * Blog post stats: Pub/Sub channel per post (`blog:stats:<postId>`) + Redis list outbox for workers.
   * Payload shape: `docs/BLOG_REALTIME_STATS.md`.
   */
  blog: {
    statsChannel: (postId: string) => `blog:stats:${postId}`,
    statsOutbox: 'blog:stats:outbox',
  },

  notifications: {
    userChannel: (userId: string) => `notifications:user:${userId}`,
    outbox: 'notifications:outbox',
    milestoneSent: (postId: string, metric: string, threshold: number) =>
      `notif:milestone:${postId}:${metric}:${threshold}`,
    trendingSent: (postId: string) => `notif:trending:${postId}`,
  },

  achievements: {
    stream: 'stream:achievements',
    catalog: (version: number) => `achievement:catalog:v${version}`,
    leaderboardPoints: 'achievement:leaderboard:points',
    lock: (userId: string, achievementId: string) =>
      `achievement:lock:${userId}:${achievementId}`,
  },

  search: {
    result: (qHash: string) => `search:result:${qHash}`,
    rateLimit: (ip: string, minute: number) => `search:rl:${ip}:${minute}`,
    index: {
      tags: 'search:index:tags',
      categories: 'search:index:categories',
      squads: 'search:index:squads',
      features: 'search:index:features',
      blogsRecent: 'search:index:blogs:recent',
    },
  },
} as const;
