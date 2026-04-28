import { SecurityEventModel } from '../../models/SecurityEvent.js';
function getClientMeta(req) {
    const ip = req.ip ??
        req.socket?.remoteAddress ??
        req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
        'unknown';
    const userAgent = req.get('User-Agent') ?? '';
    return { ip, userAgent };
}
export async function logSecurityEvent(userId, type, req, metadata = {}) {
    const { ip, userAgent } = getClientMeta(req);
    try {
        const doc = { type, ip, userAgent, metadata };
        if (userId)
            doc.userId = userId;
        await SecurityEventModel.create(doc);
    }
    catch (e) {
        console.error('SecurityEvent log failed:', e);
    }
}
//# sourceMappingURL=securityEventLog.js.map