import dotenv from 'dotenv';
dotenv.config();
export const env = {
    PORT: Number.parseInt(process.env.PORT ?? '', 10),
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
    EMAIL_API_AUTH: (process.env.EMAIL_API_AUTH ?? 'bearer'),
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
    X_CONSUMER_KEY: process.env.X_CONSUMER_KEY ?? process.env.X_CLIENT_ID ?? process.env.TWITTER_CONSUMER_KEY,
    X_CONSUMER_SECRET: process.env.X_CONSUMER_SECRET ?? process.env.X_CLIENT_SECRET ?? process.env.TWITTER_CONSUMER_SECRET,
    // Discord OAuth2 (https://discord.com/developers/applications)
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    // JWT (7d = stay logged in 7 days; refresh to get new access token when expired)
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? '7d',
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY ?? '7d',
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
    /** Feedback form: internal notify address (falls back to EMAIL_FROM / EMAIL_USER / RESEND_FROM in controller). */
    FEEDBACK_NOTIFY_EMAIL: process.env.FEEDBACK_NOTIFY_EMAIL,
    /** Referral / invite links: HMAC cookie signing (optional in dev). */
    REFERRAL_SIGNING_SECRET: process.env.REFERRAL_SIGNING_SECRET,
    /** When false, `applyReferralOnNewUser` is a no-op. */
    REFERRALS_ENABLED: (process.env.REFERRALS_ENABLED ?? '').toLowerCase() === 'true',
    /** ClamAV TCP (INSTREAM). When host unset, scans are skipped unless CLAMAV_REQUIRED. */
    CLAMAV_HOST: process.env.CLAMAV_HOST,
    CLAMAV_PORT: Number.parseInt(process.env.CLAMAV_PORT ?? '3310', 10),
    CLAMAV_REQUIRED: (process.env.CLAMAV_REQUIRED ?? '').toLowerCase() === 'true',
};
//# sourceMappingURL=env.js.map