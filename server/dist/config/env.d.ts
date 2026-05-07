export declare const env: {
    readonly PORT: number;
    readonly NODE_ENV: string | undefined;
    readonly MONGODB_URI: string | undefined;
    readonly REDIS_URL: string | undefined;
    readonly SESSION_SECRET: string | undefined;
    readonly FRONTEND_URL: string | undefined;
    readonly BACKEND_URL: string;
    readonly EMAIL_USER: string | undefined;
    readonly EMAIL_APP_PASSWORD: string | undefined;
    readonly EMAIL_HOST: string | undefined;
    readonly EMAIL_PORT: number;
    /** When using API, verified sender (e.g. onboarding@resend.dev). Falls back to EMAIL_USER. */
    readonly EMAIL_FROM: string | undefined;
    readonly EMAIL_API_URL: string | undefined;
    readonly EMAIL_API_KEY: string | undefined;
    /** bearer = Authorization: Bearer <key>. header = custom header (see EMAIL_API_HEADER_NAME). */
    readonly EMAIL_API_AUTH: "bearer" | "header";
    readonly EMAIL_API_HEADER_NAME: string | undefined;
    readonly GOOGLE_CLIENT_ID: string | undefined;
    readonly GOOGLE_CLIENT_SECRET: string | undefined;
    readonly GITHUB_CLIENT_ID: string | undefined;
    readonly GITHUB_CLIENT_SECRET: string | undefined;
    readonly FACEBOOK_APP_ID: string | undefined;
    readonly FACEBOOK_APP_SECRET: string | undefined;
    readonly X_CONSUMER_KEY: string | undefined;
    readonly X_CONSUMER_SECRET: string | undefined;
    readonly DISCORD_CLIENT_ID: string | undefined;
    readonly DISCORD_CLIENT_SECRET: string | undefined;
    readonly JWT_ACCESS_EXPIRY: string;
    readonly JWT_REFRESH_EXPIRY: string;
    readonly IDEMPOTENCY_TTL_SEC: number;
    /** 32-byte key (base64 or hex) to encrypt Google/GitHub/etc. provider tokens at rest on User. Optional: plaintext if unset. */
    readonly OAUTH_PROVIDER_TOKEN_KEY: string | undefined;
    /** Optional HMAC pepper for email OTP hashes (defaults to JWT_SECRET if unset). */
    readonly OTP_PEPPER: string | undefined;
    /** Login OTP lifetime (seconds). Default 300 (5m). */
    readonly OTP_LOGIN_TTL_SECONDS: number;
    /** Signup OTP lifetime (seconds). Default 600 (10m). */
    readonly OTP_SIGNUP_TTL_SECONDS: number;
    /** Minimum seconds between sending a new code to the same email+purpose. */
    readonly OTP_MIN_RESEND_SECONDS: number;
    /** ALTCHA PoW: HMAC key for createChallenge / verifySolution (defaults to JWT_SECRET in dev). */
    readonly ALTCHA_HMAC_KEY: string | undefined;
    /** When true, require ALTCHA on send-otp / signup-email even if key is missing (fails closed). */
    readonly ALTCHA_REQUIRED: boolean;
    /** Resend HTTP API (fallback after SMTP failure, or primary if only this is set). */
    readonly RESEND_API_KEY: string | undefined;
    readonly RESEND_FROM: string | undefined;
    /** Inbox for feedback notifications; falls back to EMAIL_FROM / EMAIL_USER / RESEND_FROM when unset. */
    readonly FEEDBACK_NOTIFY_EMAIL: string | undefined;
    /** Optional ClamAV daemon (TCP, usually port 3310). When unset, virus scan step is skipped (Sharp still re-encodes). */
    readonly CLAMAV_HOST: string | undefined;
    readonly CLAMAV_PORT: number;
    /**
     * When true, image uploads that go through `imageMasterHandler` require a successful ClamAV scan
     * (host must be configured or uploads fail with 503).
     */
    readonly CLAMAV_REQUIRED: boolean;
    /**
     * When true, ensure local clamd is running before listen (127.0.0.1 / localhost only).
     * Default: on in `NODE_ENV=development`, off otherwise. Ignored in production deploy if false.
     */
    readonly CLAMAV_AUTO_START: boolean;
    /** When `'false'`, skip referral attribution (signup still works). Default: enabled. */
    readonly REFERRALS_ENABLED: boolean;
    /** HMAC for signed `ss_ref` cookie; falls back to SESSION_SECRET / JWT_SECRET. */
    readonly REFERRAL_SIGNING_SECRET: string;
    /** Public web app origin for Stripe success/cancel URLs (defaults to first `FRONTEND_URL` entry). */
    readonly PUBLIC_APP_URL: string;
    readonly STRIPE_PORTAL_RETURN_URL: string;
    readonly STRIPE_SECRET_KEY: string;
    readonly STRIPE_WEBHOOK_SECRET: string;
    readonly STRIPE_PRICE_PRO: string;
    readonly STRIPE_PRICE_PROPLUS: string;
    readonly STRIPE_PRICE_ULTRA: string;
    /** Shared secret for internal billing tools (replay webhook). Header: `X-Internal-Billing-Secret`. */
    readonly INTERNAL_BILLING_SECRET: string;
    readonly BILLING_SYNC_STALE_SEC: number;
    readonly BILLING_SUMMARY_CACHE_TTL_SEC: number;
    readonly BILLING_WEBHOOK_RETRY_MS: number;
    readonly BILLING_RECONCILE_INTERVAL_MS: number;
    readonly BILLING_RECONCILE_SHARD_PCT: number;
    readonly BILLING_WEBHOOK_MAX_RETRIES: number;
    /**
     * When `false`, staff JWT routes use legacy `requireStaff` only (all-or-nothing for management APIs).
     * When `true` (default), `/api/v1/admin/management/*` enforces per-permission RBAC from AdminRole documents.
     */
    readonly FEATURE_ADMIN_RBAC_ENABLED: boolean;
    /** §21 — `strict` blocks writes when mustReaccept; `soft` sets X-Legal-Reconsent-Required only. */
    readonly LEGAL_ENFORCEMENT_MODE: "strict" | "soft";
    readonly LEGAL_DELETION_COOLDOWN_HOURS: number;
    readonly LEGAL_DELETION_SLA_DAYS: number;
    readonly LEGAL_JOB_POLL_MS: number;
    readonly LEGAL_INTEGRITY_INTERVAL_MS: number;
};
//# sourceMappingURL=env.d.ts.map