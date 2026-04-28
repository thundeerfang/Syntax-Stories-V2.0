/**
 * GET /api/webhooks/session/ping
 * Lightweight authenticated check for clients to verify the access token after reload.
 * Does not issue new tokens (refresh remains on POST /auth/refresh or client refresh flow).
 */
export async function sessionPing(req, res) {
    const user = req.user;
    if (!user?._id) {
        res.status(401).json({ ok: false, message: 'Unauthorized' });
        return;
    }
    res.status(200).json({
        ok: true,
        userId: String(user._id),
    });
}
//# sourceMappingURL=sessionPing.controller.js.map