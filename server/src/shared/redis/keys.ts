export const redisKeys = {
  oauth: {
    link: (linkKey: string) => `link:${linkKey}`,
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
  challenge: (tokenHash: string) => `auth:challenge:${tokenHash}`,
  otp: {
    storage: (purpose: "login" | "signup", emailNorm: string) =>
      purpose === "login"
        ? `otp:login:${emailNorm}`
        : `otp:signup:${emailNorm}`,
    resendGate: (purpose: "login" | "signup", emailNorm: string) =>
      `otp:resend:${purpose}:${emailNorm}`,
    codeVer: (purpose: "login" | "signup", emailNorm: string) =>
      `otp:codeVer:${purpose}:${emailNorm}`,
    sendLock: (normalizedEmail: string) => `otp:send:lock:${normalizedEmail}`,
    sendCount: (normalizedEmail: string) => `otp:send:count:${normalizedEmail}`,
    sendStrike: (normalizedEmail: string) =>
      `otp:send:strike:${normalizedEmail}`,
  },
  idempotency: (clientKey: string) => `idem:${clientKey}`,
  analytics: {
    profileOverview: (usernameLower: string) =>
      `profile:analytics:${usernameLower}`,
    profileTimeseries: (usernameLower: string) =>
      `profile:analytics:${usernameLower}:timeseries`,
    rateLimitProfileView: (ip: string) => `rl:analytics:profile-view:${ip}`,
  },
  follow: {
    dailyCap: (userId: string, dayKey: string) =>
      `cap:follow:${userId}:${dayKey}`,
  },
  readStreak: {
    dailyHash: (userId: string) => `user:${userId}:streak:daily`,
    readDaysZset: (userId: string) => `user:${userId}:readDays`,
    viewSession: (sessionId: string) => `read:session:${sessionId}`,
    viewCommitAck: (userId: string, sessionId: string) =>
      `read:view_commit_ack:${userId}:${sessionId}`,
    viewStartRateLimit: (userId: string, minuteEpoch: number) =>
      `rl:read:start:${userId}:${minuteEpoch}`,
  },
  invite: {
    codeCache: (normalizedCode: string) => `invite:code:${normalizedCode}`,
    oauthSignupNonce: (nonce: string) => `invite:oauth:signup:${nonce}`,
    leaderboard: "referral:leaderboard",
    userStats: (userId: string) => `referral:user:${userId}:stats`,
    fraudDevice: (deviceHash: string) => `referral:fraud:device:${deviceHash}`,
  },
  adminInvite: {
    otp: (emailNorm: string) => `admin:invite:otp:${emailNorm}`,
    otpVersion: (emailNorm: string) => `admin:invite:otpVer:${emailNorm}`,
    verified: (token: string) => `admin:invite:verified:${token}`,
  },
  rateLimit: {
    sendOtp: "rl:sendotp:",
    verifyOtp: "rl:verifyotp:",
    staffLogin: "rl:stafflogin:",
    signupEmail: "rl:signupemail:",
    refresh: "rl:refresh:",
    updateProfile: "rl:updateprofile:",
    feedback: "rl:feedback:",
    contact: "rl:contact:",
    inviteResolve: "rl:invite:resolve:",
    createCheckout: "rl:billing:checkout:",
    verifyCheckout: "rl:billing:verify:",
    authHttpKey: (prefix: string, keySuffix: string) => `${prefix}${keySuffix}`,
  },
  billing: {
    webhookDedup: (eventId: string) => `stripe:wh:${eventId}`,
    subscriptionSummary: (userId: string) => `subscription:summary:${userId}`,
    billingLock: (stripeSubscriptionId: string) =>
      `lock:billing:${stripeSubscriptionId}`,
  },
  adminPerms: (staffUserId: string) => `admin:perms:${staffUserId}`,
  iam: {
    permissionSnapshot: (sessionId: string) => `iam:snapshot:${sessionId}`,
    permissionVersion: (userId: string) => `iam:permver:${userId}`,
    permissionInvalidateChannel: "iam.permission.invalidate",
    stepUp: (sessionId: string) => `iam:stepup:${sessionId}`,
    adminBootAck: (sessionId: string) => `iam:adminboot:${sessionId}`,
    adminStepUpGrace: (sessionId: string) =>
      `iam:adminstepup:grace:${sessionId}`,
    impersonation: (sessionId: string) => `iam:impersonate:${sessionId}`,
    sessionRisk: (sessionId: string) => `iam:risk:${sessionId}`,
    metrics: "iam:metrics",
  },
  queues: {
    authEmail: "queues:auth-email",
  },
  streams: {
    audit: "stream:audit",
    security: "stream:security",
    auth: "stream:auth",
    achievements: "stream:achievements",
    gamification: "stream:gamification",
  },
  blog: {
    statsChannel: (postId: string) => `blog:stats:${postId}`,
    statsOutbox: "blog:stats:outbox",
  },
  notifications: {
    userChannel: (userId: string) => `notifications:user:${userId}`,
    outbox: "notifications:outbox",
    milestoneSent: (postId: string, metric: string, threshold: number) =>
      `notif:milestone:${postId}:${metric}:${threshold}`,
    trendingSent: (postId: string) => `notif:trending:${postId}`,
  },
  achievements: {
    stream: "stream:achievements",
    userChannel: (userId: string) => `achievements:unlock:${userId}`,
    unlockOutbox: "achievements:unlock:outbox",
    catalog: (version: number) => `achievement:catalog:v${version}`,
    leaderboardPoints: "achievement:leaderboard:points",
    lock: (userId: string, achievementId: string) =>
      `achievement:lock:${userId}:${achievementId}`,
  },
  platform: {
    storageBlocked: "platform:storage:blocked",
    storageReason: "platform:storage:reason",
    storageSince: "platform:storage:since",
    storageAlerted: "platform:storage:alerted",
    publicStats: "platform:stats:public",
    uptimeHour: (bucket: string) => `platform:uptime:hour:${bucket}`,
  },
  search: {
    result: (qHash: string) => `search:result:${qHash}`,
    rateLimit: (ip: string, minute: number) => `search:rl:${ip}:${minute}`,
    index: {
      tags: "search:index:tags",
      categories: "search:index:categories",
      squads: "search:index:squads",
      features: "search:index:features",
      blogsRecent: "search:index:blogs:recent",
    },
  },
} as const;
