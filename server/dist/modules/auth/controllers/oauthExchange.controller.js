import { consumeOAuthExchange } from '../../../oauth/oauth.exchange.service.js';
/**
 * `POST /auth/oauth/exchange` — swap one-time redirect code for tokens (no secrets in browser history/referrer).
 */
export async function exchangeOAuthCode(req, res) {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code) {
        res.status(400).json({ success: false, message: 'Exchange code is required.' });
        return;
    }
    const payload = await consumeOAuthExchange(code);
    if (!payload) {
        res.status(400).json({ success: false, message: 'Invalid or expired exchange code.' });
        return;
    }
    res.status(200).json({
        success: true,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        userId: payload.userId,
        [payload.idField]: payload.providerId,
    });
}
//# sourceMappingURL=oauthExchange.controller.js.map