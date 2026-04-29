import { env } from '../config/env.js';
import { getFrontendRedirectBase, getProductionAllowedOrigins, isOriginAllowed } from '../config/frontendUrl.js';
import { normalizeReferralCode, resolveCodeForDisplay, ensureReferralCodeForUser, lookupReferrerIdByCode, buildSignedReferralCookieValue, REFERRAL_COOKIE, } from '../services/referral.service.js';
import { UserModel } from '../models/User.js';
/** Allow same-origin path or full URL matching configured frontend. */
function sanitizeRedirectTarget(raw) {
    const defaultPath = '/';
    const base = getFrontendRedirectBase();
    if (typeof raw !== 'string' || !raw.trim())
        return defaultPath;
    const t = raw.trim();
    if (t.startsWith('/')) {
        if (t.includes('//'))
            return defaultPath;
        return t;
    }
    try {
        const u = new URL(t);
        const allowedOrigins = env.NODE_ENV === 'production' ? getProductionAllowedOrigins() : base ? [new URL(base).origin] : [];
        if (env.NODE_ENV === 'production') {
            if (!isOriginAllowed(u.origin, allowedOrigins))
                return defaultPath;
        }
        else if (base) {
            const b = new URL(base).origin;
            if (u.origin !== b)
                return defaultPath;
        }
        const path = u.pathname + u.search + u.hash;
        return path || defaultPath;
    }
    catch {
        return defaultPath;
    }
}
/** GET /api/invites/attach?code=&next= — Set-Cookie signed ss_ref, redirect to frontend. */
export async function attachReferralCookie(req, res) {
    try {
        const nextPath = sanitizeRedirectTarget(req.query.next);
        const base = (getFrontendRedirectBase() || '').replace(/\/$/, '');
        const target = `${base}${nextPath.startsWith('/') ? nextPath : `/${nextPath}`}`;
        const code = normalizeReferralCode(req.query.code);
        if (!code) {
            res.redirect(target);
            return;
        }
        const referrerId = await lookupReferrerIdByCode(code);
        const signed = referrerId ? buildSignedReferralCookieValue(code) : null;
        if (signed) {
            res.cookie(REFERRAL_COOKIE.name, signed, {
                maxAge: REFERRAL_COOKIE.maxMs,
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            });
        }
        res.redirect(target);
    }
    catch (err) {
        console.error(err);
        const fb = (getFrontendRedirectBase() || '/').replace(/\/$/, '') + '/';
        res.redirect(fb);
    }
}
/** GET /api/invites/resolve?code= */
export async function getInviteResolve(req, res) {
    try {
        const code = typeof req.query.code === 'string' ? req.query.code : '';
        const out = await resolveCodeForDisplay(code);
        if (!out.valid) {
            res.status(200).json({ valid: false });
            return;
        }
        res.status(200).json({
            valid: true,
            username: out.username,
            fullName: out.fullName,
            profileImg: out.profileImg,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ valid: false, message: 'Internal error' });
    }
}
/** GET /api/invites/me */
export async function getInviteMe(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const code = await ensureReferralCodeForUser(String(user._id));
        const fe = (getFrontendRedirectBase() || '').replace(/\/$/, '');
        const be = (env.BACKEND_URL || '').replace(/\/$/, '');
        const invitePath = `/invite/${encodeURIComponent(code)}`;
        const inviteUrl = fe ? `${fe}${invitePath}` : invitePath;
        const attachParams = new URLSearchParams({ code, next: '/' });
        const attachUrl = be ? `${be}/api/invites/attach?${attachParams}` : `/api/invites/attach?${attachParams}`;
        res.status(200).json({
            success: true,
            referralCode: code,
            inviteUrl,
            attachUrl,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load invite' });
    }
}
/** GET /api/invites/stats */
export async function getInviteStats(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const converted = await UserModel.countDocuments({ referredByUserId: user._id });
        res.status(200).json({ success: true, converted });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load stats' });
    }
}
//# sourceMappingURL=invite.controller.js.map