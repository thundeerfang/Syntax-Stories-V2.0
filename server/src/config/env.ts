import dotenv from 'dotenv';

dotenv.config();

const parsedPort = Number.parseInt(process.env.PORT ?? '5000', 10);

export const env = {
  PORT: Number.isNaN(parsedPort) ? 5000 : parsedPort,
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGO_CONN,
  REDIS_URL: process.env.REDIS_URL,
  SESSION_SECRET: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL,
  BACKEND_URL: (process.env.BACKEND_URL || '').replace(/\/$/, ''),

  // Email (OTP) — SMTP (e.g. Gmail) or HTTP API (e.g. Resend: POST https://api.resend.com/emails)
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS,
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: Number.parseInt(process.env.EMAIL_PORT ?? '587', 10),
  /** When using API, verified sender (e.g. onboarding@resend.dev). Falls back to EMAIL_USER. */
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_API_URL: process.env.EMAIL_API_URL,
  EMAIL_API_KEY: process.env.EMAIL_API_KEY,
  /** bearer = Authorization: Bearer <key>. header = custom header (see EMAIL_API_HEADER_NAME). */
  EMAIL_API_AUTH: (process.env.EMAIL_API_AUTH ?? 'bearer') as 'bearer' | 'header',
  EMAIL_API_HEADER_NAME: process.env.EMAIL_API_HEADER_NAME,

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLOUD_COMPUTING ?? process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLOUD_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,

  // GitHub OAuth
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLOUD_SECRET ?? process.env.GITHUB_CLIENT_SECRET,

  // Facebook OAuth
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,

  // X (Twitter) OAuth — X Developer Portal may show "Client ID" / "Client Secret" (same as consumer key/secret for OAuth 1.0a)
  X_CONSUMER_KEY:
    process.env.X_CONSUMER_KEY ?? process.env.X_CLIENT_ID ?? process.env.TWITTER_CONSUMER_KEY,
  X_CONSUMER_SECRET:
    process.env.X_CONSUMER_SECRET ??
    process.env.X_CLIENT_SECRET ??
    process.env.TWITTER_CONSUMER_SECRET,

  // Discord OAuth2 (https://discord.com/developers/applications)
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,

  // Twitch OAuth2 (https://dev.twitch.tv/console/apps)
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,

  // JWT (7d = stay logged in 7 days; refresh to get new access token when expired)
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? '7d',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  /**
   * After rotation, accept the previous refresh token for this many ms (parallel reload / stale localStorage).
   * Default 2 minutes. Set `0` to disable grace (strict reuse detection).
   */
  REFRESH_REUSE_GRACE_MS: Math.max(
    0,
    Number.parseInt(process.env.REFRESH_REUSE_GRACE_MS ?? '120000', 10) || 0
  ),
  IDEMPOTENCY_TTL_SEC: Number.parseInt(process.env.IDEMPOTENCY_TTL_SEC ?? '86400', 10),

  /** 32-byte key (base64 or hex) to encrypt Google/GitHub/etc. provider tokens at rest on User. Optional: plaintext if unset. */
  OAUTH_PROVIDER_TOKEN_KEY: process.env.OAUTH_PROVIDER_TOKEN_KEY,

  /** Optional HMAC pepper for email OTP hashes (defaults to JWT_SECRET if unset). */
  OTP_PEPPER: process.env.OTP_PEPPER,

  /** Login OTP lifetime (seconds). Default 300 (5m). */
  OTP_LOGIN_TTL_SECONDS: Number.parseInt(process.env.OTP_LOGIN_TTL_SECONDS ?? '300', 10),
  /** Signup OTP lifetime (seconds). Default 600 (10m). */
  OTP_SIGNUP_TTL_SECONDS: Number.parseInt(process.env.OTP_SIGNUP_TTL_SECONDS ?? '600', 10),
  /** Minimum seconds between sending a new code to the same email+purpose. */
  OTP_MIN_RESEND_SECONDS: Number.parseInt(process.env.OTP_MIN_RESEND_SECONDS ?? '60', 10),

  /** ALTCHA PoW: HMAC key for createChallenge / verifySolution (defaults to JWT_SECRET in dev). */
  ALTCHA_HMAC_KEY: process.env.ALTCHA_HMAC_KEY,
  /** When true, require ALTCHA on send-otp / signup-email even if key is missing (fails closed). */
  ALTCHA_REQUIRED: (process.env.ALTCHA_REQUIRED ?? '').toLowerCase() === 'true',

  /** Resend HTTP API (fallback after SMTP failure, or primary if only this is set). */
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM: process.env.RESEND_FROM,

  /** Inbox for feedback notifications; falls back to EMAIL_FROM / EMAIL_USER / RESEND_FROM when unset. */
  FEEDBACK_NOTIFY_EMAIL: process.env.FEEDBACK_NOTIFY_EMAIL,

  /** Optional ClamAV daemon (TCP, usually port 3310). When unset, virus scan step is skipped (Sharp still re-encodes). */
  CLAMAV_HOST: process.env.CLAMAV_HOST,
  CLAMAV_PORT: Number.parseInt(process.env.CLAMAV_PORT ?? '3310', 10),
  /**
   * When true, image uploads that go through `imageMasterHandler` require a successful ClamAV scan
   * (host must be configured or uploads fail with 503).
   */
  CLAMAV_REQUIRED: (process.env.CLAMAV_REQUIRED ?? '').toLowerCase() === 'true',
  /**
   * When true, ensure local clamd is running before listen (127.0.0.1 / localhost only).
   * Default: on in `NODE_ENV=development`, off otherwise. Ignored in production deploy if false.
   */
  CLAMAV_AUTO_START: (() => {
    const v = process.env.CLAMAV_AUTO_START;
    if (v !== undefined && v !== '') return v.toLowerCase() === 'true';
    return process.env.NODE_ENV === 'development';
  })(),

  /** When `'false'`, skip referral attribution (signup still works). Default: enabled. */
  REFERRALS_ENABLED: (process.env.REFERRALS_ENABLED ?? '').toLowerCase() !== 'false',
  /** XP granted to referrer on verified referral (0 = disabled). */
  REFERRAL_REFERRER_XP: Math.max(
    0,
    Number.parseInt(process.env.REFERRAL_REFERRER_XP ?? '100', 10) || 0
  ),
  /** `signup` = verify immediately after fraud pass; `profile` = defer until profile complete. */
  REFERRAL_QUALIFY_MODE: (process.env.REFERRAL_QUALIFY_MODE ?? 'signup').toLowerCase() as
    | 'signup'
    | 'profile',
  /** Max verified referrals per referrer per hour before velocity flag. */
  REFERRAL_VELOCITY_LIMIT: Math.max(
    1,
    Number.parseInt(process.env.REFERRAL_VELOCITY_LIMIT ?? '25', 10) || 25
  ),
  /** Process referral side effects via gamification outbox + worker when Redis is up. */
  REFERRAL_ASYNC: (process.env.REFERRAL_ASYNC ?? process.env.ACHIEVEMENT_ASYNC ?? '')
    .toLowerCase() === '1',
  /** HMAC for signed `ss_ref` cookie; falls back to SESSION_SECRET / JWT_SECRET. */
  REFERRAL_SIGNING_SECRET:
    process.env.REFERRAL_SIGNING_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    '',

  /** Public web app origin for Stripe success/cancel URLs (defaults to first `FRONTEND_URL` entry). */
  PUBLIC_APP_URL: (() => {
    const explicit = process.env.PUBLIC_APP_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, '');
    const fe = process.env.FRONTEND_URL?.split(',')[0]?.trim();
    return fe ? fe.replace(/\/$/, '') : '';
  })(),
  STRIPE_PORTAL_RETURN_URL: process.env.STRIPE_PORTAL_RETURN_URL?.trim().replace(/\/$/, '') || '',

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY?.trim() || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET?.trim() || '',
  STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO?.trim() || '',
  STRIPE_PRICE_PROPLUS: process.env.STRIPE_PRICE_PROPLUS?.trim() || '',
  STRIPE_PRICE_ULTRA: process.env.STRIPE_PRICE_ULTRA?.trim() || '',

  /** Shared secret for internal billing tools (replay webhook). Header: `X-Internal-Billing-Secret`. */
  INTERNAL_BILLING_SECRET: process.env.INTERNAL_BILLING_SECRET?.trim() || '',

  BILLING_SYNC_STALE_SEC: Number.parseInt(process.env.BILLING_SYNC_STALE_SEC ?? '120', 10),
  BILLING_SUMMARY_CACHE_TTL_SEC: Number.parseInt(
    process.env.BILLING_SUMMARY_CACHE_TTL_SEC ?? '60',
    10
  ),
  BILLING_WEBHOOK_RETRY_MS: Number.parseInt(process.env.BILLING_WEBHOOK_RETRY_MS ?? '60000', 10),
  BILLING_RECONCILE_INTERVAL_MS: Number.parseInt(
    process.env.BILLING_RECONCILE_INTERVAL_MS ?? `${6 * 60 * 60 * 1000}`,
    10
  ),
  BILLING_RECONCILE_SHARD_PCT: Number.parseInt(process.env.BILLING_RECONCILE_SHARD_PCT ?? '5', 10),
  BILLING_WEBHOOK_MAX_RETRIES: Number.parseInt(process.env.BILLING_WEBHOOK_MAX_RETRIES ?? '25', 10),

  /**
   * When `false`, staff JWT routes use legacy `requireStaff` only (all-or-nothing for management APIs).
   * When `true` (default), `/api/v1/admin/management/*` enforces per-permission RBAC from AdminRole documents.
   */
  FEATURE_ADMIN_RBAC_ENABLED:
    (process.env.FEATURE_ADMIN_RBAC_ENABLED ?? 'true').toLowerCase() !== 'false',

  /** When true, staff tokens are set as httpOnly cookies (admin app must use credentials: include). */
  FEATURE_ADMIN_HTTPONLY_COOKIES:
    (process.env.FEATURE_ADMIN_HTTPONLY_COOKIES ?? '').toLowerCase() === 'true',

  /** Optional cookie Domain for admin session cookies (e.g. `.syntax.com`). */
  ADMIN_COOKIE_DOMAIN: process.env.ADMIN_COOKIE_DOMAIN?.trim() || undefined,

  /** Prefer BullMQ for auth email jobs when Redis is available. */
  FEATURE_AUTH_EMAIL_BULLMQ:
    (process.env.FEATURE_AUTH_EMAIL_BULLMQ ?? 'true').toLowerCase() !== 'false',

  /** Bind staff sessions to trusted device fingerprints (Phase 5). */
  FEATURE_ADMIN_DEVICE_BINDING:
    (process.env.FEATURE_ADMIN_DEVICE_BINDING ?? '').toLowerCase() === 'true',

  /** Enforce session tier on privileged management routes (Phase 5). */
  FEATURE_ADMIN_SESSION_TIERS:
    (process.env.FEATURE_ADMIN_SESSION_TIERS ?? 'true').toLowerCase() !== 'false',

  /** Allow operator impersonation of platform users (Phase 5). */
  FEATURE_ADMIN_IMPERSONATION:
    (process.env.FEATURE_ADMIN_IMPERSONATION ?? 'true').toLowerCase() !== 'false',

  /** SAML SSO foundation (not fully implemented — status API only). */
  FEATURE_SAML_SSO: (process.env.FEATURE_SAML_SSO ?? '').toLowerCase() === 'true',

  /** SCIM provisioning foundation (not fully implemented — status API only). */
  FEATURE_SCIM_PROVISIONING: (process.env.FEATURE_SCIM_PROVISIONING ?? '').toLowerCase() === 'true',

  SAML_ENTITY_ID: process.env.SAML_ENTITY_ID?.trim() || undefined,
  SAML_IDP_SSO_URL: process.env.SAML_IDP_SSO_URL?.trim() || undefined,
  SAML_ACS_URL: process.env.SAML_ACS_URL?.trim() || undefined,
  SAML_SP_CERT: process.env.SAML_SP_CERT?.trim() || undefined,
  /** Dev-only: accept email in ACS body without full assertion validation. */
  FEATURE_SAML_DEV_ACS: (process.env.FEATURE_SAML_DEV_ACS ?? '').toLowerCase() === 'true',

  SCIM_BASE_URL: process.env.SCIM_BASE_URL?.trim() || undefined,
  SCIM_BEARER_TOKEN: process.env.SCIM_BEARER_TOKEN?.trim() || undefined,

  FEATURE_ADMIN_RISK_ENGINE:
    (process.env.FEATURE_ADMIN_RISK_ENGINE ?? 'true').toLowerCase() !== 'false',

  FEATURE_ADMIN_TEMPORAL_PERMISSIONS:
    (process.env.FEATURE_ADMIN_TEMPORAL_PERMISSIONS ?? 'true').toLowerCase() !== 'false',

  FEATURE_ADMIN_REBAC: (process.env.FEATURE_ADMIN_REBAC ?? 'true').toLowerCase() !== 'false',

  /** Touch ID / platform passkey step-up for admin (WebAuthn). Default on. */
  FEATURE_ADMIN_PASSKEY_STEPUP:
    (process.env.FEATURE_ADMIN_PASSKEY_STEPUP ?? 'true').toLowerCase() !== 'false',

  /** Bootstrap operator email for admin-platform seeds. */
  ADMIN_BOOTSTRAP_EMAIL: (process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@syntax.com')
    .trim()
    .toLowerCase(),
  /**
   * Bootstrap operator password. In production, set explicitly.
   * Dev fallback `1234` when unset and NODE_ENV is not `production`.
   */
  ADMIN_BOOTSTRAP_PASSWORD:
    process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() ||
    (process.env.NODE_ENV === 'production' ? '' : '1234'),

  /** §21 — `strict` blocks writes when mustReaccept; `soft` sets X-Legal-Reconsent-Required only. */
  LEGAL_ENFORCEMENT_MODE: process.env.LEGAL_ENFORCEMENT_MODE === 'strict' ? 'strict' : 'soft',
  LEGAL_DELETION_COOLDOWN_HOURS: Number.parseInt(
    process.env.LEGAL_DELETION_COOLDOWN_HOURS ?? '24',
    10
  ),
  LEGAL_DELETION_SLA_DAYS: Number.parseInt(process.env.LEGAL_DELETION_SLA_DAYS ?? '30', 10),
  LEGAL_JOB_POLL_MS: Number.parseInt(process.env.LEGAL_JOB_POLL_MS ?? '5000', 10),
  LEGAL_INTEGRITY_INTERVAL_MS: Number.parseInt(
    process.env.LEGAL_INTEGRITY_INTERVAL_MS ?? `${24 * 60 * 60 * 1000}`,
    10
  ),

  /** When true + Redis available, achievement evaluation runs via outbox/worker (SSE for unlocks). */
  ACHIEVEMENT_ASYNC:
    process.env.ACHIEVEMENT_ASYNC === '1' || process.env.ACHIEVEMENT_ASYNC === 'true',

  /** Unified navbar search — Redis result cache TTL (seconds). */
  SEARCH_CACHE_TTL_SEC: Math.max(
    5,
    Number.parseInt(process.env.SEARCH_CACHE_TTL_SEC ?? '45', 10) || 45
  ),
  /** Per-IP unified search requests per minute. */
  SEARCH_RATE_LIMIT_PER_MIN: Math.max(
    5,
    Number.parseInt(process.env.SEARCH_RATE_LIMIT_PER_MIN ?? '30', 10) || 30
  ),
} as const;
