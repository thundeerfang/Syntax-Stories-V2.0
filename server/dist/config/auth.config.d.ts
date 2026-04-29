export declare const authConfig: {
    JWT_ACCESS_PRIVATE_KEY: string | null;
    JWT_ACCESS_PUBLIC_KEY: string | null;
    JWT_ALGORITHM: "RS256";
    ACCESS_TOKEN_EXPIRY: string;
    REFRESH_TOKEN_EXPIRY: string;
    FRONTEND_URL: string | undefined;
    /** @deprecated use OTP_LOGIN_TTL_SECONDS / OTP_SIGNUP_TTL_SECONDS */
    OTP_TTL_SECONDS: number;
    OTP_LOGIN_TTL_SECONDS: number;
    OTP_SIGNUP_TTL_SECONDS: number;
    OTP_MIN_RESEND_SECONDS: number;
    RATE_LIMIT_SEND_OTP: {
        windowMs: number;
        max: number;
    };
    RATE_LIMIT_VERIFY_OTP: {
        windowMs: number;
        max: number;
    };
    RATE_LIMIT_REFRESH: {
        windowMs: number;
        max: number;
    };
    RATE_LIMIT_SIGNUP: {
        windowMs: number;
        max: number;
    };
    /** Profile PATCH (legacy + section routes): per-IP, limits spam rewrites and audit noise. */
    RATE_LIMIT_UPDATE_PROFILE: {
        windowMs: number;
        max: number;
    };
    RATE_LIMIT_FEEDBACK: {
        windowMs: number;
        max: number;
    };
    RATE_LIMIT_INVITE_RESOLVE: {
        windowMs: number;
        max: number;
    };
};
//# sourceMappingURL=auth.config.d.ts.map