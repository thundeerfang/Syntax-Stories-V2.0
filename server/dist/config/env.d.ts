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
    /** Feedback form: internal notify address (falls back to EMAIL_FROM / EMAIL_USER / RESEND_FROM in controller). */
    readonly FEEDBACK_NOTIFY_EMAIL: string | undefined;
    /** Referral / invite links: HMAC cookie signing (optional in dev). */
    readonly REFERRAL_SIGNING_SECRET: string | undefined;
    /** When false, `applyReferralOnNewUser` is a no-op. */
    readonly REFERRALS_ENABLED: boolean;
    /** ClamAV TCP (INSTREAM). When host unset, scans are skipped unless CLAMAV_REQUIRED. */
    readonly CLAMAV_HOST: string | undefined;
    readonly CLAMAV_PORT: number;
    readonly CLAMAV_REQUIRED: boolean;
};
//# sourceMappingURL=env.d.ts.map