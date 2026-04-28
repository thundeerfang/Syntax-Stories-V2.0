import crypto from 'node:crypto';
import { authConfig } from '../../../config/auth.config.js';
import { signAccessToken } from '../../../config/jwt.js';
import { getRedis } from '../../../config/redis.js';
import { writeAuditLog } from '../../../shared/audit/auditLog.js';
import { AuditAction } from '../../../shared/audit/events.js';
import { redisKeys } from '../../../shared/redis/keys.js';
import { createSession, generateRefreshToken } from '../../../services/session.service.js';
import { logSecurityEvent } from '../securityEventLog.js';
const QR_LOGIN_TTL_SECONDS = 5 * 60;
export async function initQrLogin(_req, res) {
    try {
        const redis = getRedis();
        if (!redis) {
            res.status(503).json({ message: 'Service temporarily unavailable', success: false });
            return;
        }
        const token = crypto.randomBytes(24).toString('hex');
        const key = redisKeys.auth.qrLogin(token);
        await redis.setEx(key, QR_LOGIN_TTL_SECONDS, JSON.stringify({ approved: false }));
        res.status(201).json({ success: true, qrToken: token });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
export async function approveQrLogin(req, res) {
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
        const redis = getRedis();
        if (!redis) {
            res.status(503).json({ message: 'Service temporarily unavailable', success: false });
            return;
        }
        const key = redisKeys.auth.qrLogin(qrToken);
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
export async function pollQrLogin(req, res) {
    try {
        const { qrToken } = req.body;
        if (!qrToken) {
            res.status(400).json({ message: 'qrToken is required', success: false });
            return;
        }
        const redis = getRedis();
        if (!redis) {
            res.status(503).json({ message: 'Service temporarily unavailable', success: false });
            return;
        }
        const key = redisKeys.auth.qrLogin(qrToken);
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
        const userId = parsed.userId;
        const refreshToken = generateRefreshToken();
        const session = await createSession(userId, req, refreshToken);
        const accessToken = signAccessToken({ _id: userId, sessionId: String(session._id) });
        await redis.del(key);
        await logSecurityEvent(userId, 'session_created', req, { source: 'qr_login' });
        void writeAuditLog(req, AuditAction.SESSION_CREATED, {
            actorId: userId,
            metadata: {
                sessionId: String(session._id),
                deviceName: session.deviceName,
                source: 'qr_login',
                expiresAt: session.expiresAt?.toISOString?.(),
            },
        });
        void writeAuditLog(req, AuditAction.USER_SIGNIN, { actorId: userId, metadata: { source: 'qr_login' } });
        res.status(200).json({
            success: true,
            pending: false,
            accessToken,
            refreshToken,
            expiresIn: authConfig.ACCESS_TOKEN_EXPIRY,
            sessionId: session._id,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
//# sourceMappingURL=qrLogin.controller.js.map