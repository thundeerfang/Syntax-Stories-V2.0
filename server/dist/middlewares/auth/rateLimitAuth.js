import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authConfig } from '../../config/auth.config.js';
import { redisKeys } from '../../shared/redis/keys.js';
import { RedisRateLimitStore } from './redisRateLimitStore.js';
const FP_HEADER = 'x-device-fingerprint';
function fingerprintSuffix(req) {
    const raw = req.headers[FP_HEADER];
    const s = Array.isArray(raw) ? raw[0] : raw;
    const t = typeof s === 'string' ? s.trim().slice(0, 128) : '';
    return t ? `:${t}` : '';
}
function createRateLimiter(windowMs, max, prefix, useFingerprint = false) {
    const store = RedisRateLimitStore(prefix, windowMs);
    return rateLimit({
        windowMs,
        limit: max,
        message: { message: 'Too many attempts. Please try again later.', success: false },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req, _res) => ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0') +
            (useFingerprint ? fingerprintSuffix(req) : ''),
        handler: (req, res) => {
            res.status(429).json({
                message: 'Too many attempts. Please try again later.',
                success: false,
                retryAfter: 60,
            });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        store: store,
    });
}
export const rateLimitSendOtp = createRateLimiter(authConfig.RATE_LIMIT_SEND_OTP.windowMs, authConfig.RATE_LIMIT_SEND_OTP.max, redisKeys.rateLimit.sendOtp, true);
export const rateLimitVerifyOtp = createRateLimiter(authConfig.RATE_LIMIT_VERIFY_OTP.windowMs, authConfig.RATE_LIMIT_VERIFY_OTP.max, redisKeys.rateLimit.verifyOtp, true);
export const rateLimitSignupEmail = createRateLimiter(authConfig.RATE_LIMIT_SIGNUP.windowMs, authConfig.RATE_LIMIT_SIGNUP.max, redisKeys.rateLimit.signupEmail, true);
export const rateLimitRefresh = createRateLimiter(authConfig.RATE_LIMIT_REFRESH.windowMs, authConfig.RATE_LIMIT_REFRESH.max, redisKeys.rateLimit.refresh);
export const rateLimitUpdateProfile = createRateLimiter(authConfig.RATE_LIMIT_UPDATE_PROFILE.windowMs, authConfig.RATE_LIMIT_UPDATE_PROFILE.max, redisKeys.rateLimit.updateProfile);
export const rateLimitFeedback = createRateLimiter(authConfig.RATE_LIMIT_FEEDBACK.windowMs, authConfig.RATE_LIMIT_FEEDBACK.max, redisKeys.rateLimit.feedback, true);
export const rateLimitInviteResolve = createRateLimiter(authConfig.RATE_LIMIT_INVITE_RESOLVE.windowMs, authConfig.RATE_LIMIT_INVITE_RESOLVE.max, redisKeys.rateLimit.inviteResolve);
//# sourceMappingURL=rateLimitAuth.js.map