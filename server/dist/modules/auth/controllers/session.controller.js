import crypto from 'node:crypto';
import { UserModel } from '../../../models/User.js';
import { SessionModel } from '../../../models/Session.js';
import { SecurityEventModel } from '../../../models/SecurityEvent.js';
import { authConfig } from '../../../config/auth.config.js';
import { signAccessToken } from '../../../config/jwt.js';
import { writeAuditLog } from '../../../shared/audit/auditLog.js';
import { AuditAction } from '../../../shared/audit/events.js';
import { logSecurityEvent } from '../securityEventLog.js';
import { SESSION_DURATION_MS } from '../../../services/session.service.js';
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
export async function refresh(req, res) {
    try {
        const refreshTokenRaw = req.body.refreshToken;
        if (!refreshTokenRaw) {
            res.status(400).json({ message: 'Refresh token required', success: false });
            return;
        }
        const refreshTokenHash = hashToken(refreshTokenRaw);
        const session = await SessionModel.findOne({
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
        const user = await UserModel.findById(session.userId).select('isActive');
        if (!user || !user.isActive) {
            res.status(401).json({ message: 'Account disabled or not found', success: false });
            return;
        }
        session.lastActiveAt = new Date();
        session.expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
        await session.save();
        const accessToken = signAccessToken({ _id: String(user._id), sessionId: String(session._id) });
        res.status(200).json({
            message: 'Token refreshed 🚀',
            success: true,
            accessToken,
            expiresIn: authConfig.ACCESS_TOKEN_EXPIRY,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
export async function logout(req, res) {
    try {
        const user = req.user;
        const body = req.body;
        const sessionId = body.sessionId ?? user?.sessionId;
        const refreshToken = body.refreshToken;
        async function revokeOne(session) {
            if (!session || session.revoked || !user?._id)
                return;
            session.revoked = true;
            await session.save();
            const sid = String(session._id);
            await logSecurityEvent(user._id, 'session_revoked', req, { sessionId: sid });
            void writeAuditLog(req, AuditAction.USER_SIGNOUT, { actorId: String(user._id), metadata: { sessionId: sid } });
            void writeAuditLog(req, AuditAction.SESSION_REVOKED, { actorId: String(user._id), metadata: { sessionId: sid } });
        }
        if (user?._id && sessionId) {
            const byId = await SessionModel.findOne({ _id: sessionId, userId: user._id });
            await revokeOne(byId);
        }
        if (user?._id && refreshToken) {
            const refreshTokenHash = hashToken(refreshToken);
            const byRt = await SessionModel.findOne({ refreshTokenHash, userId: user._id });
            await revokeOne(byRt);
        }
        res.status(200).json({ message: 'Logged out successfully 👋', success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
/** Revoke session by refresh token only (no JWT). Use when token expired and client clears state. */
export async function revokeSessionByRefreshToken(req, res) {
    try {
        const refreshTokenRaw = req.body.refreshToken;
        if (!refreshTokenRaw || typeof refreshTokenRaw !== 'string') {
            res.status(400).json({ message: 'refreshToken required', success: false });
            return;
        }
        const refreshTokenHash = hashToken(refreshTokenRaw);
        const session = await SessionModel.findOne({ refreshTokenHash });
        if (session) {
            session.revoked = true;
            await session.save();
            await logSecurityEvent(String(session.userId), 'session_revoked', req, { sessionId: session._id });
            void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
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
export async function listSessions(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const limitRaw = req.query.limit ?? '20';
        const limit = Math.max(1, Math.min(Number.parseInt(limitRaw, 10) || 20, 50));
        const sessions = await SessionModel.find({
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
export async function revokeSession(req, res) {
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
        const session = await SessionModel.findOne({ _id: sessionId, userId: user._id });
        if (!session || session.revoked) {
            res.status(404).json({ message: 'Session not found', success: false });
            return;
        }
        session.revoked = true;
        await session.save();
        await logSecurityEvent(String(user._id), 'session_revoked', req, { sessionId });
        void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
            actorId: String(user._id),
            metadata: { sessionId },
        });
        res.status(200).json({ success: true, message: 'Session revoked' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
export async function logoutAll(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        await SessionModel.updateMany({ userId: user._id, revoked: false }, { $set: { revoked: true } });
        await logSecurityEvent(String(user._id), 'session_revoked', req, { scope: 'all' });
        void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
            actorId: String(user._id),
            metadata: { scope: 'all' },
        });
        res.status(200).json({ success: true, message: 'All sessions revoked' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
export async function logoutOthers(req, res) {
    try {
        const user = req.user;
        if (!user?._id || !user.sessionId) {
            res.status(400).json({ message: 'Current session information missing', success: false });
            return;
        }
        await SessionModel.updateMany({ userId: user._id, _id: { $ne: user.sessionId }, revoked: false }, { $set: { revoked: true } });
        await logSecurityEvent(String(user._id), 'session_revoked', req, { scope: 'others' });
        void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
            actorId: String(user._id),
            metadata: { scope: 'others' },
        });
        res.status(200).json({ success: true, message: 'Other sessions revoked' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error 💀', success: false });
    }
}
export async function listSecurityEvents(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const limitRaw = req.query.limit ?? '20';
        const limit = Math.max(1, Math.min(Number.parseInt(limitRaw, 10) || 20, 50));
        const events = await SecurityEventModel.find({ userId: user._id })
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
//# sourceMappingURL=session.controller.js.map