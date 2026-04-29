"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSessionAndTokens = createSessionAndTokens;
exports.sendOtp = sendOtp;
exports.signupEmail = signupEmail;
exports.verifyOtp = verifyOtp;
exports.verifyTwoFactorLogin = verifyTwoFactorLogin;
exports.refresh = refresh;
exports.logout = logout;
exports.revokeSessionByRefreshToken = revokeSessionByRefreshToken;
exports.me = me;
exports.setupTwoFactor = setupTwoFactor;
exports.enableTwoFactor = enableTwoFactor;
exports.disableTwoFactor = disableTwoFactor;
exports.listSessions = listSessions;
exports.revokeSession = revokeSession;
exports.logoutAll = logoutAll;
exports.logoutOthers = logoutOthers;
exports.listSecurityEvents = listSecurityEvents;
exports.updateProfile = updateProfile;
exports.parseCv = parseCv;
exports.createIntent = createIntent;
exports.deleteAccount = deleteAccount;
exports.linkRequest = linkRequest;
exports.initEmailChange = initEmailChange;
exports.verifyEmailChange = verifyEmailChange;
exports.cancelEmailChange = cancelEmailChange;
exports.disconnectProvider = disconnectProvider;
exports.initQrLogin = initQrLogin;
exports.approveQrLogin = approveQrLogin;
exports.pollQrLogin = pollQrLogin;
const crypto_1 = __importDefault(require("crypto"));
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const User_1 = require("../models/User");
const Session_1 = require("../models/Session");
const SecurityEvent_1 = require("../models/SecurityEvent");
const Subscription_1 = require("../models/Subscription");
const auth_config_1 = require("../config/auth.config");
const jwt_1 = require("../config/jwt");
const redis_1 = require("../config/redis");
const env_1 = require("../config/env");
const authChallenge_1 = require("../utils/authChallenge");
const auditLog_1 = require("../utils/auditLog");
const sendTransactionalEmail_1 = require("../utils/sendTransactionalEmail");
const OTP_PREFIX = 'otp:email:';
const OTP_TTL = (auth_config_1.authConfig.OTP_TTL_SECONDS || 600) * 1000;
const OTP_ATTEMPT_PREFIX = 'otp:attempts:';
const OTP_ATTEMPT_LIMIT = 10;
const OTP_ATTEMPT_BLOCK_SECONDS = 5 * 60;
const INTENT_PREFIX = 'intent:user:';
const INTENT_TTL_SECONDS = 5 * 60;
const TWO_FA_SETUP_PREFIX = '2fa:setup:';
const TWO_FA_SETUP_TTL_SECONDS = 10 * 60;
const QR_LOGIN_PREFIX = 'qr:login:';
const QR_LOGIN_TTL_SECONDS = 5 * 60;
const EMAIL_CHANGE_PREFIX = 'emailchange:';
const EMAIL_CHANGE_TTL_SEC = 600; // 10 min
/** Session duration and sliding window: extend session by this much on each refresh so active users stay logged in */
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ALLOWED_INTENT_ACTIONS = ['delete_account'];
function generateOtpCode() {
    return String(crypto_1.default.randomInt(100000, 999999));
}
function getClientMeta(req) {
    const ip = req.ip ??
        req.connection?.remoteAddress ??
        req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
        'unknown';
    const userAgent = req.get('User-Agent') ?? '';
    return { ip, userAgent };
}
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function generateRefreshToken() {
    return crypto_1.default.randomBytes(40).toString('hex');
}
function parseUserAgent(ua) {
    if (!ua)
        return 'Unknown device';
    const match = ua.match(/\((.*?)\)/);
    const os = match ? match[1] : ua.substring(0, 50);
    const mobile = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';
    return `${mobile} - ${os}`;
}
async function createSession(userId, req, refreshToken) {
    const { ip, userAgent } = getClientMeta(req);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const session = await Session_1.SessionModel.create({
        userId,
        refreshTokenHash: hashToken(refreshToken),
        deviceName: parseUserAgent(userAgent),
        userAgent,
        ip,
        expiresAt,
    });
    return session;
}
/** Create a session and return access + refresh tokens and session. Used by OAuth callbacks so the client can refresh when access token expires. */
async function createSessionAndTokens(userId, req) {
    const refreshToken = generateRefreshToken();
    const session = await createSession(userId, req, refreshToken);
    const accessToken = (0, jwt_1.signAccessToken)({ _id: userId, sessionId: String(session._id) });
    return { accessToken, refreshToken, session };
}
async function logSecurityEvent(userId, type, req, metadata = {}) {
    const { ip, userAgent } = getClientMeta(req);
    try {
        const doc = { type, ip, userAgent, metadata };
        if (userId)
            doc.userId = userId;
        await SecurityEvent_1.SecurityEventModel.create(doc);
    }
    catch (e) {
        console.error('SecurityEvent log failed:', e);
    }
}
async function storeOtp(email, payload) {
    const redis = (0, redis_1.getRedis)();
    const key = OTP_PREFIX + email.toLowerCase().trim();
    const value = JSON.stringify(payload);
    if (redis) {
        await redis.setEx(key, Math.ceil(OTP_TTL / 1000), value);
        return;
    }
    throw new Error('Redis required for OTP');
}
async function getOtp(email) {
    const redis = (0, redis_1.getRedis)();
    const key = OTP_PREFIX + email.toLowerCase().trim();
    if (!redis)
        return null;
    const value = await redis.get(key);
    if (!value)
        return null;
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
async function deleteOtp(email) {
    const redis = (0, redis_1.getRedis)();
    const key = OTP_PREFIX + email.toLowerCase().trim();
    if (redis)
        await redis.del(key);
}
async function storeIntent(userId, action) {
    const redis = (0, redis_1.getRedis)();
    if (!redis) {
        throw new Error('Redis required for intent tokens');
    }
    const rawToken = crypto_1.default.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const key = INTENT_PREFIX + tokenHash;
    const payload = JSON.stringify({ userId, action });
    await redis.setEx(key, INTENT_TTL_SECONDS, payload);
    return { token: rawToken, expiresIn: INTENT_TTL_SECONDS };
}
async function getTwoFactorSetupSecret(userId) {
    const redis = (0, redis_1.getRedis)();
    if (!redis)
        return null;
    const key = TWO_FA_SETUP_PREFIX + userId;
    return (await redis.get(key)) ?? null;
}
async function storeTwoFactorSetupSecret(userId, secret) {
    const redis = (0, redis_1.getRedis)();
    if (!redis) {
        throw new Error('Redis required for 2FA setup');
    }
    const key = TWO_FA_SETUP_PREFIX + userId;
    await redis.setEx(key, TWO_FA_SETUP_TTL_SECONDS, secret);
}
function isEmailConfigured() {
    return (0, sendTransactionalEmail_1.isEmailTransportConfigured)();
}
async function sendOtp(req, res) {
    try {
        if (!isEmailConfigured()) {
            res.status(503).json({
                message: 'Email is not configured. Cannot send login code.',
                success: false,
            });
            return;
        }
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const existing = await User_1.UserModel.findOne({ email: normalizedEmail });
        if (!existing) {
            res.status(404).json({
                message: 'No account found with this email. Please sign up first.',
                success: false,
            });
            return;
        }
        const code = generateOtpCode();
        await storeOtp(normalizedEmail, { code });
        await (0, sendTransactionalEmail_1.sendTransactionalEmail)({
            to: normalizedEmail,
            subject: 'Your Syntax Stories login code',
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f9; color: #333;">
          <h2 style="color: #5f4fe6;">Your verification code</h2>
          <p style="font-size: 16px;">Use this code to sign in:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
          <p style="font-size: 14px; color: #666;">This code expires in 10 minutes.</p>
        </div>
      `,
        });
        res.status(200).json({ message: 'Verification code sent to your email 📧', success: true });
    }
    catch (err) {
        console.error(err);
        const message = err.message === 'Redis required for OTP'
            ? 'Service temporarily unavailable. Try again later.'
            : err.code === 'EAUTH' ||
                String(err.message).includes('Email API')
                ? (0, sendTransactionalEmail_1.getEmailSendErrorMessage)(err)
                : 'Internal Server Error 💀';
        res.status(500).json({ message, success: false });
    }
}
async function signupEmail(req, res) {
    try {
        if (!isEmailConfigured()) {
            res.status(503).json({
                message: 'Email is not configured. Cannot send verification code.',
                success: false,
            });
            return;
        }
        const { fullName, email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedFullName = fullName?.trim() || 'User';
        const existing = await User_1.UserModel.findOne({ email: normalizedEmail });
        if (existing) {
            res.status(409).json({
                message: 'An account with this email already exists. Sign in with email instead.',
                success: false,
            });
            return;
        }
        const code = generateOtpCode();
        await storeOtp(normalizedEmail, {
            code,
            fullName: normalizedFullName,
        });
        await (0, sendTransactionalEmail_1.sendTransactionalEmail)({
            to: normalizedEmail,
            subject: 'Verify your Syntax Stories account',
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f9; color: #333;">
          <h2 style="color: #5f4fe6;">Welcome to Syntax Stories</h2>
          <p style="font-size: 16px;">Your verification code:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
          <p style="font-size: 14px; color: #666;">This code expires in 10 minutes.</p>
        </div>
      `,
        });
        res.status(200).json({ message: 'Verification code sent to your email 📧', success: true });
    }
    catch (err) {
        console.error(err);
        const message = err.message === 'Redis required for OTP'
            ? 'Service temporarily unavailable.'
            : err.code === 'EAUTH' ||
                String(err.message).includes('Email API')
                ? (0, sendTransactionalEmail_1.getEmailSendErrorMessage)(err)
                : 'Internal Server Error 💀';
        res.status(500).json({ message, success: false });
    }
}
async function verifyOtp(req, res) {
    try {
        const { email, code } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const redis = (0, redis_1.getRedis)();
        // Per-email throttle: if too many bad codes, block for a short period
        if (redis) {
            const attemptKey = OTP_ATTEMPT_PREFIX + normalizedEmail;
            const attemptRaw = await redis.get(attemptKey);
            const attempts = attemptRaw ? parseInt(attemptRaw, 10) || 0 : 0;
            if (attempts >= OTP_ATTEMPT_LIMIT) {
                res.status(429).json({
                    message: 'Too many invalid codes. Please wait 5 minutes before trying again.',
                    success: false,
                });
                return;
            }
        }
        const stored = await getOtp(normalizedEmail);
        if (!stored || stored.code !== code) {
            await logSecurityEvent(null, 'login_failure', req, { email: normalizedEmail, reason: 'invalid_otp' });
            void (0, auditLog_1.writeAuditLog)(req, 'login_failure', { metadata: { email: normalizedEmail, reason: 'invalid_otp' } });
            // Increment failed-attempt counter for this email
            if (redis) {
                const attemptKey = OTP_ATTEMPT_PREFIX + normalizedEmail;
                const count = await redis.incr(attemptKey);
                if (count === 1) {
                    await redis.expire(attemptKey, OTP_ATTEMPT_BLOCK_SECONDS);
                }
                if (count >= OTP_ATTEMPT_LIMIT) {
                    res.status(429).json({
                        message: 'Too many invalid codes. Please wait 5 minutes before trying again.',
                        success: false,
                    });
                    return;
                }
            }
            res.status(401).json({
                message: 'Invalid or expired code. Request a new one.',
                success: false,
            });
            return;
        }
        await deleteOtp(normalizedEmail);
        // Successful verification: clear failed-attempt counter if present
        if (redis) {
            const attemptKey = OTP_ATTEMPT_PREFIX + normalizedEmail;
            await redis.del(attemptKey);
        }
        let user = await User_1.UserModel.findOne({ email: normalizedEmail });
        let isNewUser = false;
        if (stored.fullName && !user) {
            const randomNumber = Math.floor(1000 + Math.random() * 9000);
            const username = stored.fullName.trim().toLowerCase().replace(/\s+/g, '') + randomNumber;
            user = new User_1.UserModel({
                fullName: stored.fullName,
                username,
                email: normalizedEmail,
                isGoogleAccount: false,
                isGitAccount: false,
                isFacebookAccount: false,
                isXAccount: false,
                isAppleAccount: false,
                isDiscordAccount: false,
                emailVerified: true,
            });
            await user.save();
            isNewUser = true;
            const subscription = await Subscription_1.SubscriptionModel.create({
                userId: user._id,
                plan: 'free',
                status: 'active',
            });
            user.subscription = subscription._id;
            await user.save();
            await logSecurityEvent(String(user._id), 'login_success', req, { source: 'signup_email' });
            void (0, auditLog_1.writeAuditLog)(req, 'user_signup', { actorId: String(user._id), metadata: { source: 'email' } });
        }
        else if (user) {
            await logSecurityEvent(String(user._id), 'login_success', req, { source: 'otp' });
        }
        else {
            res.status(400).json({ message: 'No account found. Sign up first.', success: false });
            return;
        }
        // 2FA: if enabled, require authenticator code before issuing tokens
        if (user.twoFactorEnabled) {
            try {
                const { challengeToken, expiresIn } = await (0, authChallenge_1.createAuthChallenge)(String(user._id));
                res.status(200).json({
                    success: true,
                    twoFactorRequired: true,
                    challengeToken,
                    expiresIn,
                    isNewUser,
                    message: 'Two-factor authentication required.',
                });
                return;
            }
            catch {
                res.status(503).json({
                    success: false,
                    message: 'Two-factor authentication temporarily unavailable. Try again later.',
                });
                return;
            }
        }
        const refreshToken = generateRefreshToken();
        const session = await createSession(String(user._id), req, refreshToken);
        const accessToken = (0, jwt_1.signAccessToken)({ _id: String(user._id), sessionId: String(session._id) });
        const source = isNewUser ? 'signup_email' : 'otp';
        void (0, auditLog_1.writeAuditLog)(req, 'session_created', {
            actorId: String(user._id),
            metadata: {
                sessionId: String(session._id),
                deviceName: session.deviceName,
                source,
                expiresAt: session.expiresAt?.toISOString?.(),
            },
        });
        void (0, auditLog_1.writeAuditLog)(req, 'user_signin', {
            actorId: String(user._id),
            metadata: { source },
        });
        res.status(200).json({
            message: 'Signed in successfully 🚀',
            success: true,
            accessToken,
            refreshToken,
            expiresIn: auth_config_1.authConfig.ACCESS_TOKEN_EXPIRY,
            sessionId: session._id,
            isNewUser,
            user: {
                _id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                profileImg: (0, User_1.normalizeProfileImg)(user.profileImg),
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function verifyTwoFactorLogin(req, res) {
    try {
        const { challengeToken, token } = req.body;
        if (!challengeToken || !token) {
            res.status(400).json({ success: false, message: 'challengeToken and token are required' });
            return;
        }
        const challenge = await (0, authChallenge_1.consumeAuthChallenge)(challengeToken);
        if (!challenge?.userId) {
            res.status(400).json({ success: false, message: 'Invalid or expired 2FA challenge' });
            return;
        }
        const dbUser = await User_1.UserModel.findById(challenge.userId).select('+twoFactorSecret');
        if (!dbUser || !dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
            res.status(400).json({ success: false, message: 'Two-factor authentication is not enabled' });
            return;
        }
        const isValid = speakeasy_1.default.totp.verify({
            secret: dbUser.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1,
        });
        if (!isValid) {
            res.status(401).json({ success: false, message: 'Invalid 2FA code' });
            return;
        }
        const refreshToken = generateRefreshToken();
        const session = await createSession(String(dbUser._id), req, refreshToken);
        const accessToken = (0, jwt_1.signAccessToken)({ _id: String(dbUser._id), sessionId: String(session._id) });
        void (0, auditLog_1.writeAuditLog)(req, 'session_created', {
            actorId: String(dbUser._id),
            metadata: {
                sessionId: String(session._id),
                deviceName: session.deviceName,
                source: '2fa',
                expiresAt: session.expiresAt?.toISOString?.(),
            },
        });
        void (0, auditLog_1.writeAuditLog)(req, 'user_signin', { actorId: String(dbUser._id), metadata: { source: '2fa' } });
        res.status(200).json({
            success: true,
            message: 'Signed in successfully 🚀',
            accessToken,
            refreshToken,
            expiresIn: auth_config_1.authConfig.ACCESS_TOKEN_EXPIRY,
            sessionId: session._id,
            user: {
                _id: dbUser._id,
                fullName: dbUser.fullName,
                username: dbUser.username,
                email: dbUser.email,
                profileImg: (0, User_1.normalizeProfileImg)(dbUser.profileImg),
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal Server Error 💀' });
    }
}
async function refresh(req, res) {
    try {
        const refreshTokenRaw = req.body.refreshToken;
        if (!refreshTokenRaw) {
            res.status(400).json({ message: 'Refresh token required', success: false });
            return;
        }
        const refreshTokenHash = hashToken(refreshTokenRaw);
        const session = await Session_1.SessionModel.findOne({
            refreshTokenHash,
            revoked: false,
            expiresAt: { $gt: new Date() },
        });
        if (!session) {
            res.status(401).json({
                message: 'Session invalid or expired. Please log in again.',
                success: false,
            });
            return;
        }
        const user = await User_1.UserModel.findById(session.userId).select('isActive');
        if (!user || !user.isActive) {
            res.status(401).json({ message: 'Account disabled or not found', success: false });
            return;
        }
        // Sliding expiry: extend session on each refresh so active users stay logged in
        session.lastActiveAt = new Date();
        session.expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
        await session.save();
        const accessToken = (0, jwt_1.signAccessToken)({ _id: String(user._id), sessionId: String(session._id) });
        res.status(200).json({
            message: 'Token refreshed 🚀',
            success: true,
            accessToken,
            expiresIn: auth_config_1.authConfig.ACCESS_TOKEN_EXPIRY,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function logout(req, res) {
    try {
        const user = req.user;
        const sessionId = req.body.sessionId ?? user?.sessionId;
        if (sessionId && user?._id) {
            const session = await Session_1.SessionModel.findOne({ _id: sessionId, userId: user._id });
            if (session) {
                session.revoked = true;
                await session.save();
                await logSecurityEvent(user._id, 'session_revoked', req, { sessionId });
                void (0, auditLog_1.writeAuditLog)(req, 'user_signout', { actorId: String(user._id), metadata: { sessionId } });
                void (0, auditLog_1.writeAuditLog)(req, 'session_revoked', { actorId: String(user._id), metadata: { sessionId } });
            }
        }
        else {
            const refreshToken = req.body.refreshToken;
            const refreshTokenHash = refreshToken ? hashToken(refreshToken) : null;
            if (refreshTokenHash && user?._id) {
                const session = await Session_1.SessionModel.findOne({ refreshTokenHash, userId: user._id });
                if (session) {
                    session.revoked = true;
                    await session.save();
                    await logSecurityEvent(user._id, 'session_revoked', req, { sessionId: session._id });
                    void (0, auditLog_1.writeAuditLog)(req, 'user_signout', { actorId: String(user._id), metadata: { sessionId: session._id } });
                    void (0, auditLog_1.writeAuditLog)(req, 'session_revoked', { actorId: String(user._id), metadata: { sessionId: session._id } });
                }
            }
        }
        res.status(200).json({ message: 'Logged out successfully 👋', success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
/** Revoke session by refresh token only (no JWT). Use when token expired and client clears state. */
async function revokeSessionByRefreshToken(req, res) {
    try {
        const refreshTokenRaw = req.body.refreshToken;
        if (!refreshTokenRaw || typeof refreshTokenRaw !== 'string') {
            res.status(400).json({ message: 'refreshToken required', success: false });
            return;
        }
        const refreshTokenHash = hashToken(refreshTokenRaw);
        const session = await Session_1.SessionModel.findOne({ refreshTokenHash });
        if (session) {
            session.revoked = true;
            await session.save();
            await logSecurityEvent(String(session.userId), 'session_revoked', req, { sessionId: session._id });
            void (0, auditLog_1.writeAuditLog)(req, 'session_revoked', {
                actorId: String(session.userId),
                metadata: { sessionId: String(session._id) },
            });
        }
        res.status(200).json({ message: 'Session revoked', success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function me(req, res) {
    try {
        const user = req.user;
        const found = await User_1.UserModel.findById(user._id).lean();
        if (!found) {
            res.status(404).json({ message: 'User not found', success: false });
            return;
        }
        const f = found;
        res.status(200).json({
            success: true,
            user: {
                _id: found._id,
                fullName: found.fullName,
                username: found.username,
                email: found.email,
                profileImg: (0, User_1.normalizeProfileImg)(found.profileImg),
                coverBanner: found.coverBanner,
                bio: found.bio,
                job: found.job,
                portfolioUrl: found.portfolioUrl,
                linkedin: found.linkedin,
                instagram: found.instagram,
                github: found.github,
                youtube: found.youtube,
                stackAndTools: found.stackAndTools,
                workExperiences: found.workExperiences,
                education: found.education,
                certifications: found.certifications,
                projects: found.projects,
                openSourceContributions: found.openSourceContributions,
                mySetup: found.mySetup,
                isGoogleAccount: found.isGoogleAccount,
                isGitAccount: found.isGitAccount,
                isFacebookAccount: found.isFacebookAccount,
                isXAccount: found.isXAccount,
                isAppleAccount: found.isAppleAccount,
                isDiscordAccount: found.isDiscordAccount ?? false,
                twoFactorEnabled: found.twoFactorEnabled,
                createdAt: f.createdAt,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function setupTwoFactor(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const dbUser = await User_1.UserModel.findById(user._id);
        if (!dbUser) {
            res.status(404).json({ message: 'User not found', success: false });
            return;
        }
        const secret = speakeasy_1.default.generateSecret({
            length: 20,
            name: `Syntax Stories (${dbUser.email})`,
            issuer: 'Syntax Stories',
        });
        await storeTwoFactorSetupSecret(String(dbUser._id), secret.base32);
        const otpauthUrl = secret.otpauth_url ?? '';
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(otpauthUrl);
        res.status(200).json({
            success: true,
            otpauthUrl,
            qrCodeDataUrl,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function enableTwoFactor(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ message: '2FA token is required', success: false });
            return;
        }
        const setupSecret = await getTwoFactorSetupSecret(String(user._id));
        if (!setupSecret) {
            res.status(400).json({ message: '2FA setup not initialized or expired', success: false });
            return;
        }
        const isValid = speakeasy_1.default.totp.verify({
            secret: setupSecret,
            encoding: 'base32',
            token,
            window: 1,
        });
        if (!isValid) {
            res.status(401).json({ message: 'Invalid 2FA code', success: false });
            return;
        }
        const dbUser = await User_1.UserModel.findByIdAndUpdate(user._id, { twoFactorEnabled: true, twoFactorSecret: setupSecret }, { new: true });
        const redis = (0, redis_1.getRedis)();
        if (redis) {
            await redis.del(TWO_FA_SETUP_PREFIX + user._id);
        }
        if (!dbUser) {
            res.status(404).json({ message: 'User not found', success: false });
            return;
        }
        await logSecurityEvent(String(user._id), 'twofa_enabled', req, {});
        void (0, auditLog_1.writeAuditLog)(req, 'twofa_enabled', { actorId: String(user._id) });
        res.status(200).json({ success: true, message: 'Two-factor authentication enabled.' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function disableTwoFactor(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ message: '2FA token is required', success: false });
            return;
        }
        const dbUser = await User_1.UserModel.findById(user._id).select('+twoFactorSecret');
        if (!dbUser || !dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
            res.status(400).json({ message: 'Two-factor authentication is not enabled', success: false });
            return;
        }
        const isValid = speakeasy_1.default.totp.verify({
            secret: dbUser.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1,
        });
        if (!isValid) {
            res.status(401).json({ message: 'Invalid 2FA code', success: false });
            return;
        }
        dbUser.twoFactorEnabled = false;
        dbUser.twoFactorSecret = undefined;
        await dbUser.save();
        await logSecurityEvent(String(user._id), 'twofa_disabled', req, {});
        void (0, auditLog_1.writeAuditLog)(req, 'twofa_disabled', { actorId: String(user._id) });
        res.status(200).json({ success: true, message: 'Two-factor authentication disabled.' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function listSessions(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const limitRaw = req.query.limit ?? '20';
        const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 20, 50));
        const sessions = await Session_1.SessionModel.find({
            userId: user._id,
            revoked: false,
            expiresAt: { $gt: new Date() },
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        res.status(200).json({
            success: true,
            sessions: sessions.map((s) => ({
                _id: s._id,
                deviceName: s.deviceName,
                ip: s.ip,
                userAgent: s.userAgent,
                lastActiveAt: s.lastActiveAt,
                createdAt: s.createdAt,
                expiresAt: s.expiresAt,
            })),
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function revokeSession(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const { sessionId } = req.params;
        if (!sessionId) {
            res.status(400).json({ message: 'Session ID required', success: false });
            return;
        }
        const session = await Session_1.SessionModel.findOne({ _id: sessionId, userId: user._id });
        if (!session || session.revoked) {
            res.status(404).json({ message: 'Session not found', success: false });
            return;
        }
        session.revoked = true;
        await session.save();
        await logSecurityEvent(String(user._id), 'session_revoked', req, { sessionId });
        res.status(200).json({ success: true, message: 'Session revoked' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function logoutAll(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        await Session_1.SessionModel.updateMany({ userId: user._id, revoked: false }, { $set: { revoked: true } });
        await logSecurityEvent(String(user._id), 'session_revoked', req, { scope: 'all' });
        res.status(200).json({ success: true, message: 'All sessions revoked' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function logoutOthers(req, res) {
    try {
        const user = req.user;
        if (!user?._id || !user.sessionId) {
            res.status(400).json({ message: 'Current session information missing', success: false });
            return;
        }
        await Session_1.SessionModel.updateMany({ userId: user._id, _id: { $ne: user.sessionId }, revoked: false }, { $set: { revoked: true } });
        await logSecurityEvent(String(user._id), 'session_revoked', req, { scope: 'others' });
        res.status(200).json({ success: true, message: 'Other sessions revoked' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function listSecurityEvents(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const limitRaw = req.query.limit ?? '20';
        const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 20, 50));
        const events = await SecurityEvent_1.SecurityEventModel.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        res.status(200).json({
            success: true,
            events: events.map((e) => ({
                _id: e._id,
                type: e.type,
                ip: e.ip,
                userAgent: e.userAgent,
                metadata: e.metadata,
                createdAt: e.createdAt,
            })),
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
const UPDATE_PROFILE_KEYS = [
    'fullName', 'username', 'bio', 'profileImg', 'coverBanner', 'job',
    'portfolioUrl', 'linkedin', 'instagram', 'github', 'youtube',
    'stackAndTools', 'workExperiences', 'education', 'certifications', 'projects', 'openSourceContributions', 'mySetup',
];
async function updateProfile(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const body = (req.body ?? {});
        const updates = {};
        for (const key of UPDATE_PROFILE_KEYS) {
            if (body[key] !== undefined)
                updates[key] = body[key];
        }
        if (Object.keys(updates).length === 0) {
            res.status(400).json({ message: 'No valid fields to update', success: false });
            return;
        }
        const profileSectionKeys = ['education', 'workExperiences', 'projects', 'certifications', 'openSourceContributions', 'stackAndTools', 'mySetup'];
        let currentProfile = null;
        if (profileSectionKeys.some((k) => updates[k] !== undefined)) {
            const doc = await User_1.UserModel.findById(user._id).select(profileSectionKeys.join(' ')).lean();
            if (doc)
                currentProfile = doc;
        }
        if (typeof updates.username === 'string') {
            const existing = await User_1.UserModel.findOne({
                username: updates.username.trim().toLowerCase(),
                _id: { $ne: user._id },
            });
            if (existing) {
                res.status(409).json({ message: 'Username is already taken. Choose another.', success: false });
                return;
            }
            updates.username = updates.username.trim().toLowerCase();
        }
        // Auto-generate workId for work experiences that don't have one
        const workExperiences = updates.workExperiences;
        if (Array.isArray(workExperiences) && workExperiences.length > 0) {
            const current = await User_1.UserModel.findById(user._id).select('workExperiences').lean();
            const existingIds = (current?.workExperiences ?? [])
                .map((we) => (we.workId ?? '').trim())
                .filter(Boolean)
                .map((id) => parseInt(id, 10))
                .filter((n) => !Number.isNaN(n));
            let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
            for (const we of workExperiences) {
                const id = (we.workId ?? '').trim();
                if (!id) {
                    we.workId = String(nextNum);
                    nextNum += 1;
                }
                else {
                    const n = parseInt(id, 10);
                    if (!Number.isNaN(n) && n >= nextNum)
                        nextNum = n + 1;
                }
            }
            updates.workExperiences = workExperiences;
        }
        // Auto-generate eduId / refCode for education entries
        const education = updates.education;
        if (Array.isArray(education) && education.length > 0) {
            const current = await User_1.UserModel.findById(user._id).select('education').lean();
            const existingIds = (current?.education ?? [])
                .map((ed) => (ed.eduId ?? '').trim())
                .filter(Boolean)
                .map((id) => parseInt(id, 10))
                .filter((n) => !Number.isNaN(n));
            let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
            const year = new Date().getFullYear();
            for (const ed of education) {
                const id = (ed.eduId ?? '').trim();
                if (!id) {
                    ed.eduId = String(nextNum);
                    nextNum += 1;
                }
                else {
                    const n = parseInt(id, 10);
                    if (!Number.isNaN(n) && n >= nextNum)
                        nextNum = n + 1;
                }
                // Always refresh refCode so it reflects latest update year
                ed.refCode = `${year}_EDU_DOC`;
            }
            updates.education = education;
        }
        // Auto-generate certId / certValType for certifications
        const certifications = updates.certifications;
        if (Array.isArray(certifications) && certifications.length > 0) {
            const current = await User_1.UserModel.findById(user._id).select('certifications').lean();
            const existingIds = (current?.certifications ?? [])
                .map((c) => (c.certId ?? '').trim())
                .filter(Boolean)
                .map((id) => parseInt(id, 10))
                .filter((n) => !Number.isNaN(n));
            let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
            const year = new Date().getFullYear();
            const yearSuffix = String(year).slice(-2);
            const baseValType = `A-${yearSuffix}`;
            for (const cert of certifications) {
                const id = (cert.certId ?? '').trim();
                if (!id) {
                    cert.certId = String(nextNum);
                    nextNum += 1;
                }
                else {
                    const n = parseInt(id, 10);
                    if (!Number.isNaN(n) && n >= nextNum)
                        nextNum = n + 1;
                }
                if (!cert.certValType || !String(cert.certValType).trim()) {
                    cert.certValType = baseValType;
                }
            }
            updates.certifications = certifications;
        }
        // Set prjLog (last updated year log) for each project
        const projects = updates.projects;
        if (Array.isArray(projects) && projects.length > 0) {
            const year = new Date().getFullYear();
            const logValue = `${year}_prd_log`;
            for (const p of projects) {
                p.prjLog = logValue;
            }
            updates.projects = projects;
        }
        const updated = await User_1.UserModel.findByIdAndUpdate(user._id, updates, {
            new: true,
            runValidators: true,
            projection: { twoFactorSecret: 0, googleToken: 0, githubToken: 0, facebookToken: 0, xToken: 0, appleToken: 0, discordToken: 0 },
        }).lean();
        if (!updated) {
            res.status(404).json({ message: 'User not found', success: false });
            return;
        }
        // Audit log: diff profile sections and log add/update/remove
        const actorId = String(user._id);
        const updatedProfile = updated;
        if (currentProfile) {
            const log = (action, targetType, metadata) => {
                void (0, auditLog_1.writeAuditLog)(req, action, { actorId, targetType, targetId: actorId, metadata });
            };
            // stackAndTools: array of strings
            if (updates.stackAndTools !== undefined) {
                const oldList = (currentProfile.stackAndTools ?? []);
                const newList = (updatedProfile.stackAndTools ?? []);
                for (const t of newList) {
                    if (!oldList.includes(t))
                        log('stack_tool_added', 'profile', { tool: t });
                }
                for (const t of oldList) {
                    if (!newList.includes(t))
                        log('stack_tool_removed', 'profile', { tool: t });
                }
            }
            // education: match by eduId
            if (updates.education !== undefined) {
                const oldE = (currentProfile.education ?? []);
                const newE = (updatedProfile.education ?? []);
                const oldIds = new Set(oldE.map((e) => (e.eduId ?? '').trim()).filter(Boolean));
                const newIds = new Set(newE.map((e) => (e.eduId ?? '').trim()).filter(Boolean));
                for (const e of newE) {
                    const id = (e.eduId ?? '').trim();
                    if (!id)
                        continue;
                    if (!oldIds.has(id))
                        log('education_added', 'education', { eduId: id, school: e.school });
                    else {
                        const prev = oldE.find((x) => (x.eduId ?? '').trim() === id);
                        if (prev && JSON.stringify(prev) !== JSON.stringify(e))
                            log('education_updated', 'education', { eduId: id });
                    }
                }
                for (const id of oldIds) {
                    if (!newIds.has(id))
                        log('education_removed', 'education', { eduId: id });
                }
            }
            // workExperiences: match by workId
            if (updates.workExperiences !== undefined) {
                const oldW = (currentProfile.workExperiences ?? []);
                const newW = (updatedProfile.workExperiences ?? []);
                const oldIds = new Set(oldW.map((w) => (w.workId ?? '').trim()).filter(Boolean));
                const newIds = new Set(newW.map((w) => (w.workId ?? '').trim()).filter(Boolean));
                for (const w of newW) {
                    const id = (w.workId ?? '').trim();
                    if (!id)
                        continue;
                    if (!oldIds.has(id))
                        log('work_added', 'work', { workId: id, company: w.company });
                    else {
                        const prev = oldW.find((x) => (x.workId ?? '').trim() === id);
                        if (prev && JSON.stringify(prev) !== JSON.stringify(w))
                            log('work_updated', 'work', { workId: id });
                    }
                }
                for (const id of oldIds) {
                    if (!newIds.has(id))
                        log('work_removed', 'work', { workId: id });
                }
            }
            // certifications: match by certId
            if (updates.certifications !== undefined) {
                const oldC = (currentProfile.certifications ?? []);
                const newC = (updatedProfile.certifications ?? []);
                const oldIds = new Set(oldC.map((c) => (c.certId ?? '').trim()).filter(Boolean));
                const newIds = new Set(newC.map((c) => (c.certId ?? '').trim()).filter(Boolean));
                for (const c of newC) {
                    const id = (c.certId ?? '').trim();
                    if (!id)
                        continue;
                    if (!oldIds.has(id))
                        log('certification_added', 'certification', { certId: id, name: c.name });
                    else {
                        const prev = oldC.find((x) => (x.certId ?? '').trim() === id);
                        if (prev && JSON.stringify(prev) !== JSON.stringify(c))
                            log('certification_updated', 'certification', { certId: id });
                    }
                }
                for (const id of oldIds) {
                    if (!newIds.has(id))
                        log('certification_removed', 'certification', { certId: id });
                }
            }
            // projects: by index (no stable id)
            if (updates.projects !== undefined) {
                const oldP = (currentProfile.projects ?? []);
                const newP = (updatedProfile.projects ?? []);
                if (newP.length > oldP.length) {
                    for (let i = oldP.length; i < newP.length; i++) {
                        const p = newP[i];
                        log('project_added', 'project', { index: i, title: p?.title });
                    }
                }
                if (newP.length < oldP.length) {
                    for (let i = newP.length; i < oldP.length; i++) {
                        log('project_removed', 'project', { index: i });
                    }
                }
                const minLen = Math.min(oldP.length, newP.length);
                for (let i = 0; i < minLen; i++) {
                    if (JSON.stringify(oldP[i]) !== JSON.stringify(newP[i])) {
                        log('project_updated', 'project', { index: i, title: newP[i]?.title });
                    }
                }
            }
            // openSourceContributions: match by repositoryUrl or index
            if (updates.openSourceContributions !== undefined) {
                const oldO = (currentProfile.openSourceContributions ?? []);
                const newO = (updatedProfile.openSourceContributions ?? []);
                const oldKeys = new Set(oldO.map((o, i) => (o.repositoryUrl ?? '').trim() || `i:${i}`));
                const newKeys = new Set(newO.map((o, i) => (o.repositoryUrl ?? '').trim() || `i:${i}`));
                for (let i = 0; i < newO.length; i++) {
                    const o = newO[i];
                    const key = (o.repositoryUrl ?? '').trim() || `i:${i}`;
                    if (!oldKeys.has(key))
                        log('open_source_added', 'open_source', { repositoryUrl: o.repositoryUrl, title: o.title });
                    else {
                        const prev = oldO.find((x, j) => ((x.repositoryUrl ?? '').trim() || `i:${j}`) === key);
                        if (prev && JSON.stringify(prev) !== JSON.stringify(o))
                            log('open_source_updated', 'open_source', { repositoryUrl: o.repositoryUrl, title: o.title });
                    }
                }
                for (let i = 0; i < oldO.length; i++) {
                    const key = (oldO[i].repositoryUrl ?? '').trim() || `i:${i}`;
                    if (!newKeys.has(key))
                        log('open_source_removed', 'open_source', { repositoryUrl: oldO[i].repositoryUrl, title: oldO[i].title });
                }
            }
            // mySetup: by index
            if (updates.mySetup !== undefined) {
                const oldM = (currentProfile.mySetup ?? []);
                const newM = (updatedProfile.mySetup ?? []);
                if (newM.length > oldM.length) {
                    for (let i = oldM.length; i < newM.length; i++) {
                        const m = newM[i];
                        log('my_setup_added', 'my_setup', { label: m?.label, index: i });
                    }
                }
                if (newM.length < oldM.length) {
                    for (let i = newM.length; i < oldM.length; i++) {
                        log('my_setup_removed', 'my_setup', { label: oldM[i]?.label, index: i });
                    }
                }
                const minLen = Math.min(oldM.length, newM.length);
                for (let i = 0; i < minLen; i++) {
                    if (JSON.stringify(oldM[i]) !== JSON.stringify(newM[i])) {
                        log('my_setup_updated', 'my_setup', { label: newM[i]?.label, index: i });
                    }
                }
            }
        }
        if (Object.keys(updates).length > 0) {
            void (0, auditLog_1.writeAuditLog)(req, 'profile_updated', { actorId, targetType: 'profile', targetId: actorId, metadata: { keys: Object.keys(updates) } });
        }
        res.status(200).json({
            success: true,
            user: {
                _id: updated._id,
                fullName: updated.fullName,
                username: updated.username,
                email: updated.email,
                profileImg: (0, User_1.normalizeProfileImg)(updated.profileImg),
                coverBanner: updated.coverBanner,
                bio: updated.bio,
                job: updated.job,
                portfolioUrl: updated.portfolioUrl,
                linkedin: updated.linkedin,
                instagram: updated.instagram,
                github: updated.github,
                youtube: updated.youtube,
                stackAndTools: updated.stackAndTools,
                workExperiences: updated.workExperiences,
                education: updated.education,
                certifications: updated.certifications,
                projects: updated.projects,
                openSourceContributions: updated.openSourceContributions,
                mySetup: updated.mySetup,
            },
        });
    }
    catch (err) {
        const code = err?.code;
        if (code === 11000) {
            res.status(409).json({ message: 'Username is already taken. Choose another.', success: false });
            return;
        }
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
/** Parse CV/Resume PDF and return extracted profile data + missing fields. Does not update user. */
async function parseCv(req, res) {
    try {
        const file = req.file;
        const buffer = file?.buffer ?? file?.buffer;
        if (!buffer) {
            res.status(400).json({ success: false, message: 'No PDF file uploaded' });
            return;
        }
        // pdf-parse v1.1.1 works in Node.js (v2 uses pdfjs-dist with browser-only APIs like DOMMatrix)
        const pdfParse = (await Promise.resolve().then(() => __importStar(require('pdf-parse')))).default;
        const { text } = await pdfParse(buffer);
        const { parseCvFromText } = await Promise.resolve().then(() => __importStar(require('../utils/parseCvFromPdf')));
        const { extracted, missingFields, incompleteItemHints } = parseCvFromText(text ?? '');
        res.status(200).json({
            success: true,
            extracted,
            missingFields,
            incompleteItemHints: incompleteItemHints ?? {},
        });
    }
    catch (err) {
        console.error('parseCv error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Failed to parse PDF',
        });
    }
}
async function createIntent(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const { action } = req.body;
        if (!action || !ALLOWED_INTENT_ACTIONS.includes(action)) {
            res.status(400).json({ message: 'Invalid or missing action', success: false });
            return;
        }
        try {
            const { token, expiresIn } = await storeIntent(String(user._id), action);
            await logSecurityEvent(String(user._id), 'session_created', req, {
                intentAction: action,
            });
            res.status(201).json({ success: true, intentToken: token, expiresIn });
        }
        catch (err) {
            const message = err.message === 'Redis required for intent tokens'
                ? 'Service temporarily unavailable. Try again later.'
                : 'Internal Server Error 💀';
            res.status(503).json({ message, success: false });
        }
    }
    catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Internal Server Error 💀', success: false });
        }
    }
}
async function deleteAccount(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        await Session_1.SessionModel.updateMany({ userId: user._id, revoked: false }, { $set: { revoked: true } });
        const updated = await User_1.UserModel.findByIdAndUpdate(user._id, { isActive: false }, { new: true });
        if (!updated) {
            res.status(404).json({ message: 'User not found', success: false });
            return;
        }
        await logSecurityEvent(String(user._id), 'account_locked', req, { reason: 'delete_account' });
        void (0, auditLog_1.writeAuditLog)(req, 'account_locked', { actorId: String(user._id), metadata: { reason: 'delete_account' } });
        void (0, auditLog_1.writeAuditLog)(req, 'account_deleted', { actorId: String(user._id), metadata: { reason: 'delete_account' } });
        res.status(200).json({
            success: true,
            message: 'Account deleted (deactivated) successfully',
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
const LINK_PREFIX = 'link:';
const LINK_TTL_SEC = 300; // 5 min
const LINK_PROVIDERS = ['google', 'github', 'facebook', 'x', 'discord'];
async function linkRequest(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const provider = req.body?.provider?.toLowerCase();
        if (!provider || !LINK_PROVIDERS.includes(provider)) {
            res.status(400).json({
                message: 'Invalid provider. Use: google, github, facebook, x, discord',
                success: false,
            });
            return;
        }
        const redis = (0, redis_1.getRedis)();
        if (!redis) {
            res.status(503).json({ message: 'Account linking is temporarily unavailable', success: false });
            return;
        }
        const linkKey = crypto_1.default.randomBytes(16).toString('hex');
        const key = LINK_PREFIX + linkKey;
        await redis.setEx(key, LINK_TTL_SEC, String(user._id));
        const base = (env_1.env.BACKEND_URL || '').replace(/\/$/, '');
        if (!base) {
            res.status(500).json({ message: 'Server misconfiguration', success: false });
            return;
        }
        res.status(200).json({
            success: true,
            redirectUrl: `${base}/auth/${provider}/link?k=${linkKey}`,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function initEmailChange(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        if (!isEmailConfigured()) {
            res.status(503).json({ message: 'Email change is not available.', success: false });
            return;
        }
        const newEmailRaw = req.body.newEmail;
        const newEmail = typeof newEmailRaw === 'string' ? newEmailRaw.toLowerCase().trim() : '';
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            res.status(400).json({ message: 'Valid new email is required.', success: false });
            return;
        }
        const doc = await User_1.UserModel.findById(user._id).select('email');
        if (!doc) {
            res.status(404).json({ message: 'User not found', success: false });
            return;
        }
        const currentEmail = (doc.email ?? '').toLowerCase();
        if (newEmail === currentEmail) {
            res.status(400).json({ message: 'New email must be different from current email.', success: false });
            return;
        }
        const existing = await User_1.UserModel.findOne({ email: newEmail });
        if (existing) {
            res.status(409).json({ message: 'An account already exists with this email.', success: false });
            return;
        }
        const redis = (0, redis_1.getRedis)();
        if (!redis) {
            res.status(503).json({ message: 'Email change temporarily unavailable.', success: false });
            return;
        }
        const codeCurrent = generateOtpCode();
        const codeNew = generateOtpCode();
        const key = EMAIL_CHANGE_PREFIX + String(user._id);
        await redis.setEx(key, EMAIL_CHANGE_TTL_SEC, JSON.stringify({ codeCurrent, codeNew, newEmail }));
        await (0, sendTransactionalEmail_1.sendTransactionalEmail)({
            to: currentEmail,
            subject: 'Verify your email change – Syntax Stories',
            html: `<p>Your verification code for changing your email: <strong>${codeCurrent}</strong>. Valid for 10 minutes.</p>`,
        });
        await (0, sendTransactionalEmail_1.sendTransactionalEmail)({
            to: newEmail,
            subject: 'Verify your new email – Syntax Stories',
            html: `<p>Your verification code for your new email: <strong>${codeNew}</strong>. Valid for 10 minutes.</p>`,
        });
        res.status(200).json({
            success: true,
            message: 'Verification codes sent to your current and new email.',
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function verifyEmailChange(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const body = req.body;
        const currentCode = (body.currentCode ?? '').trim();
        const newCode = (body.newCode ?? '').trim();
        if (!currentCode || !/^\d{6}$/.test(currentCode)) {
            res.status(400).json({ message: 'Valid 6-digit code from your current email is required.', success: false });
            return;
        }
        if (!newCode || !/^\d{6}$/.test(newCode)) {
            res.status(400).json({ message: 'Valid 6-digit code from your new email is required.', success: false });
            return;
        }
        const redis = (0, redis_1.getRedis)();
        if (!redis) {
            res.status(503).json({ message: 'Email change temporarily unavailable.', success: false });
            return;
        }
        const key = EMAIL_CHANGE_PREFIX + String(user._id);
        const raw = await redis.get(key);
        if (!raw) {
            res.status(400).json({ message: 'Codes expired or invalid. Request a new code.', success: false });
            return;
        }
        let payload;
        try {
            payload = JSON.parse(raw);
        }
        catch {
            res.status(400).json({ message: 'Invalid request. Try again.', success: false });
            return;
        }
        if (payload.codeCurrent !== currentCode || payload.codeNew !== newCode) {
            res.status(401).json({ message: 'Invalid code(s). Check both codes and try again.', success: false });
            return;
        }
        await redis.del(key);
        const doc = await User_1.UserModel.findById(user._id).select('email');
        if (!doc) {
            res.status(404).json({ message: 'User not found', success: false });
            return;
        }
        const newEmail = payload.newEmail.toLowerCase().trim();
        await User_1.UserModel.findByIdAndUpdate(user._id, {
            $set: {
                email: newEmail,
                emailVerified: true,
                isGoogleAccount: false,
                isGitAccount: false,
                isFacebookAccount: false,
                isXAccount: false,
                isAppleAccount: false,
                isDiscordAccount: false,
            },
            $unset: {
                googleId: 1,
                googleToken: 1,
                gitId: 1,
                githubToken: 1,
                facebookId: 1,
                facebookToken: 1,
                xId: 1,
                xToken: 1,
                appleId: 1,
                appleToken: 1,
                discordId: 1,
                discordToken: 1,
            },
        });
        await logSecurityEvent(String(user._id), 'login_success', req, { metadata: { email_change: true, newEmail } });
        void (0, auditLog_1.writeAuditLog)(req, 'email_change', { actorId: String(user._id), metadata: { newEmail } });
        res.status(200).json({
            success: true,
            message: 'Email updated. All OAuth providers have been unlinked. You can link them again with your new email.',
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
/** Cancel pending email change: invalidate codes so verify will fail with "expired or invalid". */
async function cancelEmailChange(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const redis = (0, redis_1.getRedis)();
        if (redis) {
            const key = EMAIL_CHANGE_PREFIX + String(user._id);
            await redis.del(key);
        }
        res.status(200).json({
            success: true,
            message: 'Email change cancelled. Codes are invalid; request new codes to try again.',
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
const DISCONNECT_PROVIDERS = ['google', 'github', 'facebook', 'x', 'discord'];
async function disconnectProvider(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const provider = req.params.provider?.toLowerCase();
        if (!provider || !DISCONNECT_PROVIDERS.includes(provider)) {
            res.status(400).json({ message: 'Invalid provider. Use: google, github, facebook, x, discord', success: false });
            return;
        }
        const doc = await User_1.UserModel.findById(user._id).select('+googleToken +githubToken +facebookToken +xToken +discordToken');
        if (!doc) {
            res.status(404).json({ message: 'User not found', success: false });
            return;
        }
        const unset = {};
        const set = {};
        if (provider === 'google') {
            unset.googleId = 1;
            unset.googleToken = 1;
            set.isGoogleAccount = false;
        }
        else if (provider === 'github') {
            unset.gitId = 1;
            unset.githubToken = 1;
            set.isGitAccount = false;
        }
        else if (provider === 'facebook') {
            unset.facebookId = 1;
            unset.facebookToken = 1;
            set.isFacebookAccount = false;
        }
        else if (provider === 'x') {
            unset.xId = 1;
            unset.xToken = 1;
            set.isXAccount = false;
        }
        else if (provider === 'discord') {
            unset.discordId = 1;
            unset.discordToken = 1;
            set.isDiscordAccount = false;
        }
        await User_1.UserModel.findByIdAndUpdate(user._id, { $unset: unset, $set: set });
        await Session_1.SessionModel.updateMany({ userId: user._id, revoked: false }, { $set: { revoked: true } });
        await logSecurityEvent(String(user._id), 'provider_disconnect', req, { provider });
        void (0, auditLog_1.writeAuditLog)(req, 'oauth_disconnected', { actorId: String(user._id), metadata: { provider } });
        res.status(200).json({
            success: true,
            message: `Disconnected from ${provider}. You have been logged out everywhere. Your email and account are unchanged.`,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function initQrLogin(_req, res) {
    try {
        const redis = (0, redis_1.getRedis)();
        if (!redis) {
            res.status(503).json({ message: 'Service temporarily unavailable', success: false });
            return;
        }
        const token = crypto_1.default.randomBytes(24).toString('hex');
        const key = QR_LOGIN_PREFIX + token;
        await redis.setEx(key, QR_LOGIN_TTL_SECONDS, JSON.stringify({ approved: false }));
        res.status(201).json({ success: true, qrToken: token });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function approveQrLogin(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const { qrToken } = req.body;
        if (!qrToken) {
            res.status(400).json({ message: 'qrToken is required', success: false });
            return;
        }
        const redis = (0, redis_1.getRedis)();
        if (!redis) {
            res.status(503).json({ message: 'Service temporarily unavailable', success: false });
            return;
        }
        const key = QR_LOGIN_PREFIX + qrToken;
        const existing = await redis.get(key);
        if (!existing) {
            res.status(400).json({ message: 'QR login session not found or expired', success: false });
            return;
        }
        await redis.setEx(key, QR_LOGIN_TTL_SECONDS, JSON.stringify({ approved: true, userId: String(user._id) }));
        res.status(200).json({ success: true, message: 'QR login approved' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
async function pollQrLogin(req, res) {
    try {
        const { qrToken } = req.body;
        if (!qrToken) {
            res.status(400).json({ message: 'qrToken is required', success: false });
            return;
        }
        const redis = (0, redis_1.getRedis)();
        if (!redis) {
            res.status(503).json({ message: 'Service temporarily unavailable', success: false });
            return;
        }
        const key = QR_LOGIN_PREFIX + qrToken;
        const value = await redis.get(key);
        if (!value) {
            res.status(404).json({ success: false, message: 'QR login session not found or expired' });
            return;
        }
        const parsed = JSON.parse(value);
        if (!parsed.approved || !parsed.userId) {
            res.status(200).json({ success: true, pending: true });
            return;
        }
        // Create a session and tokens for the approved user
        const userId = parsed.userId;
        const fakeReq = req;
        const refreshToken = generateRefreshToken();
        const session = await createSession(userId, fakeReq, refreshToken);
        const accessToken = (0, jwt_1.signAccessToken)({ _id: userId, sessionId: String(session._id) });
        await redis.del(key);
        await logSecurityEvent(userId, 'session_created', req, { source: 'qr_login' });
        void (0, auditLog_1.writeAuditLog)(req, 'session_created', {
            actorId: userId,
            metadata: {
                sessionId: String(session._id),
                deviceName: session.deviceName,
                source: 'qr_login',
                expiresAt: session.expiresAt?.toISOString?.(),
            },
        });
        void (0, auditLog_1.writeAuditLog)(req, 'user_signin', { actorId: userId, metadata: { source: 'qr_login' } });
        res.status(200).json({
            success: true,
            pending: false,
            accessToken,
            refreshToken,
            expiresIn: auth_config_1.authConfig.ACCESS_TOKEN_EXPIRY,
            sessionId: session._id,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
//# sourceMappingURL=auth.controller.js.map