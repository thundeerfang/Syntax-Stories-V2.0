export declare const rateLimitSendOtp: import("express-rate-limit").RateLimitRequestHandler;
export declare const rateLimitVerifyOtp: import("express-rate-limit").RateLimitRequestHandler;
/** POST /auth/staff-login — per IP (brute-force protection). */
export declare const rateLimitStaffLogin: import("express-rate-limit").RateLimitRequestHandler;
export declare const rateLimitSignupEmail: import("express-rate-limit").RateLimitRequestHandler;
export declare const rateLimitRefresh: import("express-rate-limit").RateLimitRequestHandler;
export declare const rateLimitUpdateProfile: import("express-rate-limit").RateLimitRequestHandler;
/** POST /api/feedback — per IP + optional device fingerprint. */
export declare const rateLimitFeedback: import("express-rate-limit").RateLimitRequestHandler;
/** POST /api/contact — per IP + optional device fingerprint. */
export declare const rateLimitContact: import("express-rate-limit").RateLimitRequestHandler;
export declare const rateLimitInviteResolve: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimitAuth.d.ts.map