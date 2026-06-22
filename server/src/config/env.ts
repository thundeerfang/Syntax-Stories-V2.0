import dotenv from "dotenv";
dotenv.config();
const parsedPort = Number.parseInt(process.env.PORT ?? "5000", 10);
const parsedNotificationWebhookPort = Number.parseInt(
  process.env.NOTIFICATION_WEBHOOK_PORT ?? "7380",
  10,
);
export const env = {
  PORT: Number.isNaN(parsedPort) ? 5000 : parsedPort,
  NOTIFICATION_WEBHOOK_PORT: Number.isNaN(parsedNotificationWebhookPort)
    ? 7380
    : parsedNotificationWebhookPort,
  NOTIFICATION_WEBHOOK_INGEST_SECRET:
    process.env.NOTIFICATION_WEBHOOK_INGEST_SECRET?.trim() || "",
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGO_CONN,
  REDIS_URL: process.env.REDIS_URL,
  SESSION_SECRET: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL,
  BACKEND_URL: (process.env.BACKEND_URL || "").replace(/\/$/, ""),
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_FROM: process.env.BREVO_FROM,
  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLOUD_COMPUTING ?? process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET:
    process.env.GOOGLE_CLOUD_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET:
    process.env.GITHUB_CLOUD_SECRET ?? process.env.GITHUB_CLIENT_SECRET,
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
  X_CONSUMER_KEY:
    process.env.X_CONSUMER_KEY ??
    process.env.X_CLIENT_ID ??
    process.env.TWITTER_CONSUMER_KEY,
  X_CONSUMER_SECRET:
    process.env.X_CONSUMER_SECRET ??
    process.env.X_CLIENT_SECRET ??
    process.env.TWITTER_CONSUMER_SECRET,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? "7d",
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY ?? "7d",
  REFRESH_REUSE_GRACE_MS: Math.max(
    0,
    Number.parseInt(process.env.REFRESH_REUSE_GRACE_MS ?? "120000", 10) || 0,
  ),
  IDEMPOTENCY_TTL_SEC: Number.parseInt(
    process.env.IDEMPOTENCY_TTL_SEC ?? "86400",
    10,
  ),
  OAUTH_PROVIDER_TOKEN_KEY: process.env.OAUTH_PROVIDER_TOKEN_KEY,
  OTP_PEPPER: process.env.OTP_PEPPER,
  OTP_LOGIN_TTL_SECONDS: Number.parseInt(
    process.env.OTP_LOGIN_TTL_SECONDS ?? "300",
    10,
  ),
  OTP_SIGNUP_TTL_SECONDS: Number.parseInt(
    process.env.OTP_SIGNUP_TTL_SECONDS ?? "600",
    10,
  ),
  OTP_MIN_RESEND_SECONDS: Number.parseInt(
    process.env.OTP_MIN_RESEND_SECONDS ?? "60",
    10,
  ),
  PLAY_REVIEWER_EMAIL: (process.env.PLAY_REVIEWER_EMAIL ?? "")
    .trim()
    .toLowerCase(),
  PLAY_REVIEWER_OTP: (process.env.PLAY_REVIEWER_OTP ?? "")
    .replaceAll(/\D/g, "")
    .slice(0, 6),
  ALTCHA_HMAC_KEY: process.env.ALTCHA_HMAC_KEY,
  ALTCHA_REQUIRED: (process.env.ALTCHA_REQUIRED ?? "").toLowerCase() === "true",
  FEEDBACK_NOTIFY_EMAIL: process.env.FEEDBACK_NOTIFY_EMAIL,
  CLAMAV_HOST: process.env.CLAMAV_HOST,
  CLAMAV_PORT: Number.parseInt(process.env.CLAMAV_PORT ?? "3310", 10),
  CLAMAV_REQUIRED: (process.env.CLAMAV_REQUIRED ?? "").toLowerCase() === "true",
  CLAMAV_AUTO_START: (() => {
    const v = process.env.CLAMAV_AUTO_START;
    if (v !== undefined && v !== "") return v.toLowerCase() === "true";
    return process.env.NODE_ENV === "development";
  })(),
  REFERRALS_ENABLED:
    (process.env.REFERRALS_ENABLED ?? "").toLowerCase() !== "false",
  REFERRAL_REFERRER_XP: Math.max(
    0,
    Number.parseInt(process.env.REFERRAL_REFERRER_XP ?? "100", 10) || 0,
  ),
  REFERRAL_QUALIFY_MODE: (
    process.env.REFERRAL_QUALIFY_MODE ?? "signup"
  ).toLowerCase() as "signup" | "profile",
  REFERRAL_VELOCITY_LIMIT: Math.max(
    1,
    Number.parseInt(process.env.REFERRAL_VELOCITY_LIMIT ?? "25", 10) || 25,
  ),
  REFERRAL_ASYNC:
    (
      process.env.REFERRAL_ASYNC ??
      process.env.ACHIEVEMENT_ASYNC ??
      ""
    ).toLowerCase() === "1",
  REFERRAL_SIGNING_SECRET:
    process.env.REFERRAL_SIGNING_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "",
  PUBLIC_APP_URL: (() => {
    const explicit = process.env.PUBLIC_APP_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, "");
    const fe = process.env.FRONTEND_URL?.split(",")[0]?.trim();
    return fe ? fe.replace(/\/$/, "") : "";
  })(),
  STRIPE_PORTAL_RETURN_URL:
    process.env.STRIPE_PORTAL_RETURN_URL?.trim().replace(/\/$/, "") || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY?.trim() || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET?.trim() || "",
  STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO?.trim() || "",
  STRIPE_PRICE_PROPLUS: process.env.STRIPE_PRICE_PROPLUS?.trim() || "",
  STRIPE_PRICE_ULTRA: process.env.STRIPE_PRICE_ULTRA?.trim() || "",
  INTERNAL_BILLING_SECRET: process.env.INTERNAL_BILLING_SECRET?.trim() || "",
  BILLING_SYNC_STALE_SEC: Number.parseInt(
    process.env.BILLING_SYNC_STALE_SEC ?? "120",
    10,
  ),
  BILLING_SUMMARY_CACHE_TTL_SEC: Number.parseInt(
    process.env.BILLING_SUMMARY_CACHE_TTL_SEC ?? "60",
    10,
  ),
  BILLING_WEBHOOK_RETRY_MS: Number.parseInt(
    process.env.BILLING_WEBHOOK_RETRY_MS ?? "60000",
    10,
  ),
  BILLING_RECONCILE_INTERVAL_MS: Number.parseInt(
    process.env.BILLING_RECONCILE_INTERVAL_MS ?? `${6 * 60 * 60 * 1000}`,
    10,
  ),
  BILLING_RECONCILE_SHARD_PCT: Number.parseInt(
    process.env.BILLING_RECONCILE_SHARD_PCT ?? "5",
    10,
  ),
  BILLING_WEBHOOK_MAX_RETRIES: Number.parseInt(
    process.env.BILLING_WEBHOOK_MAX_RETRIES ?? "25",
    10,
  ),
  FEATURE_ADMIN_RBAC_ENABLED:
    (process.env.FEATURE_ADMIN_RBAC_ENABLED ?? "true").toLowerCase() !==
    "false",
  FEATURE_ADMIN_HTTPONLY_COOKIES:
    (process.env.FEATURE_ADMIN_HTTPONLY_COOKIES ?? "").toLowerCase() === "true",
  ADMIN_COOKIE_DOMAIN: process.env.ADMIN_COOKIE_DOMAIN?.trim() || undefined,
  FEATURE_AUTH_EMAIL_BULLMQ:
    (process.env.FEATURE_AUTH_EMAIL_BULLMQ ?? "true").toLowerCase() !== "false",
  FEATURE_ADMIN_DEVICE_BINDING:
    (process.env.FEATURE_ADMIN_DEVICE_BINDING ?? "").toLowerCase() === "true",
  FEATURE_ADMIN_SESSION_TIERS:
    (process.env.FEATURE_ADMIN_SESSION_TIERS ?? "true").toLowerCase() !==
    "false",
  FEATURE_ADMIN_IMPERSONATION:
    (process.env.FEATURE_ADMIN_IMPERSONATION ?? "true").toLowerCase() !==
    "false",
  FEATURE_SAML_SSO:
    (process.env.FEATURE_SAML_SSO ?? "").toLowerCase() === "true",
  FEATURE_SCIM_PROVISIONING:
    (process.env.FEATURE_SCIM_PROVISIONING ?? "").toLowerCase() === "true",
  SAML_ENTITY_ID: process.env.SAML_ENTITY_ID?.trim() || undefined,
  SAML_IDP_SSO_URL: process.env.SAML_IDP_SSO_URL?.trim() || undefined,
  SAML_ACS_URL: process.env.SAML_ACS_URL?.trim() || undefined,
  SAML_SP_CERT: process.env.SAML_SP_CERT?.trim() || undefined,
  FEATURE_SAML_DEV_ACS:
    (process.env.FEATURE_SAML_DEV_ACS ?? "").toLowerCase() === "true",
  SCIM_BASE_URL: process.env.SCIM_BASE_URL?.trim() || undefined,
  SCIM_BEARER_TOKEN: process.env.SCIM_BEARER_TOKEN?.trim() || undefined,
  FEATURE_ADMIN_RISK_ENGINE:
    (process.env.FEATURE_ADMIN_RISK_ENGINE ?? "true").toLowerCase() !== "false",
  FEATURE_ADMIN_TEMPORAL_PERMISSIONS:
    (process.env.FEATURE_ADMIN_TEMPORAL_PERMISSIONS ?? "true").toLowerCase() !==
    "false",
  FEATURE_ADMIN_REBAC:
    (process.env.FEATURE_ADMIN_REBAC ?? "true").toLowerCase() !== "false",
  FEATURE_ADMIN_PASSKEY_STEPUP:
    (process.env.FEATURE_ADMIN_PASSKEY_STEPUP ?? "true").toLowerCase() !==
    "false",
  ADMIN_BOOTSTRAP_EMAIL: (
    process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@syntax.com"
  )
    .trim()
    .toLowerCase(),
  ADMIN_BOOTSTRAP_PASSWORD:
    process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "1234"),
  LEGAL_ENFORCEMENT_MODE:
    process.env.LEGAL_ENFORCEMENT_MODE === "strict" ? "strict" : "soft",
  LEGAL_DELETION_COOLDOWN_HOURS: Number.parseInt(
    process.env.LEGAL_DELETION_COOLDOWN_HOURS ?? "24",
    10,
  ),
  LEGAL_DELETION_SLA_DAYS: Number.parseInt(
    process.env.LEGAL_DELETION_SLA_DAYS ?? "30",
    10,
  ),
  LEGAL_JOB_POLL_MS: Number.parseInt(
    process.env.LEGAL_JOB_POLL_MS ?? "5000",
    10,
  ),
  LEGAL_INTEGRITY_INTERVAL_MS: Number.parseInt(
    process.env.LEGAL_INTEGRITY_INTERVAL_MS ?? `${24 * 60 * 60 * 1000}`,
    10,
  ),
  ACHIEVEMENT_ASYNC:
    process.env.ACHIEVEMENT_ASYNC === "1" ||
    process.env.ACHIEVEMENT_ASYNC === "true",
  SEARCH_CACHE_TTL_SEC: Math.max(
    5,
    Number.parseInt(process.env.SEARCH_CACHE_TTL_SEC ?? "45", 10) || 45,
  ),
  SEARCH_RATE_LIMIT_PER_MIN: Math.max(
    5,
    Number.parseInt(process.env.SEARCH_RATE_LIMIT_PER_MIN ?? "30", 10) || 30,
  ),
  GIPHY_API_KEY: process.env.GIPHY_API_KEY?.trim() || "",
  UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY?.trim() || "",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME?.trim() || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY?.trim() || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET?.trim() || "",
  CLOUDINARY_UPLOAD_FOLDER:
    process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || "syntax-stories",
  STORAGE_FULL_MODE: (() => {
    const v = (process.env.STORAGE_FULL_MODE ?? "auto").toLowerCase();
    if (v === "force_on" || v === "force_off") return v;
    return "auto" as const;
  })(),
  STORAGE_ALERT_EMAIL: (
    process.env.STORAGE_ALERT_EMAIL?.trim() ||
    process.env.ADMIN_BOOTSTRAP_EMAIL ||
    "admin@syntax.com"
  )
    .trim()
    .toLowerCase(),
  UPLOADS_ROOT: process.env.UPLOADS_ROOT?.trim() || "",
  UPLOADS_DISK_WARN_PCT: Math.min(
    99,
    Math.max(
      50,
      Number.parseInt(process.env.UPLOADS_DISK_WARN_PCT ?? "90", 10) || 90,
    ),
  ),
  UPLOADS_DISK_BLOCK_PCT: Math.min(
    100,
    Math.max(
      80,
      Number.parseInt(process.env.UPLOADS_DISK_BLOCK_PCT ?? "98", 10) || 98,
    ),
  ),
  STORAGE_PROBE_INTERVAL_MS: Math.max(
    30000,
    Number.parseInt(process.env.STORAGE_PROBE_INTERVAL_MS ?? "300000", 10) ||
      300000,
  ),
} as const;
