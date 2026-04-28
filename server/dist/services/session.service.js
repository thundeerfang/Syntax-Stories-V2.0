import crypto from 'node:crypto';
import { SessionModel } from '../models/Session.js';
import { signAccessToken } from '../config/jwt.js';
/** Session duration and sliding window (matches prior auth.controller / authLogin behavior). */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
function getClientMeta(req) {
    const ip = req.ip ??
        req.socket?.remoteAddress ??
        req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
        'unknown';
    const userAgent = req.get('User-Agent') ?? '';
    return { ip, userAgent };
}
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
export function generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
}
function parseUserAgent(ua) {
    if (!ua)
        return 'Unknown device';
    const parenRe = /\((.*?)\)/;
    const match = parenRe.exec(ua);
    const os = match ? match[1] : ua.substring(0, 50);
    const mobile = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';
    return `${mobile} - ${os}`;
}
export async function createSession(userId, req, refreshToken) {
    const { ip, userAgent } = getClientMeta(req);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const session = await SessionModel.create({
        userId,
        refreshTokenHash: hashToken(refreshToken),
        deviceName: parseUserAgent(userAgent),
        userAgent,
        ip,
        expiresAt,
    });
    return session;
}
/** Used by OAuth callbacks and any flow that needs JWT + refresh + persisted session. */
export async function createSessionAndTokens(userId, req) {
    const refreshToken = generateRefreshToken();
    const session = await createSession(userId, req, refreshToken);
    const accessToken = signAccessToken({ _id: userId, sessionId: String(session._id) });
    return { accessToken, refreshToken, session };
}
//# sourceMappingURL=session.service.js.map