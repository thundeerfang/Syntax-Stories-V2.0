import { UserModel } from '../../../models/User.js';
import { getRedis } from '../../../config/redis.js';
import { writeAuditLog } from '../../../shared/audit/auditLog.js';
import { AuditAction } from '../../../shared/audit/events.js';
import { sendAuthEmail, isAuthEmailConfigured } from '../../../infrastructure/mail/sendAuthEmail.js';
import { redisKeys } from '../../../shared/redis/keys.js';
import { generateEmailOtpDigits } from '../../../services/emailOtp.service.js';
import { logSecurityEvent } from '../securityEventLog.js';
const EMAIL_CHANGE_TTL_SEC = 600; // 10 min
export async function initEmailChange(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        if (!isAuthEmailConfigured()) {
            res.status(503).json({ message: 'Email change is not available.', success: false });
            return;
        }
        const newEmailRaw = req.body.newEmail;
        const newEmail = typeof newEmailRaw === 'string' ? newEmailRaw.toLowerCase().trim() : '';
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            res.status(400).json({ message: 'Valid new email is required.', success: false });
            return;
        }
        const doc = await UserModel.findById(user._id).select('email');
        if (!doc) {
            res.status(404).json({ message: 'User not found', success: false });
            return;
        }
        const currentEmail = (doc.email ?? '').toLowerCase();
        if (newEmail === currentEmail) {
            res.status(400).json({ message: 'New email must be different from current email.', success: false });
            return;
        }
        const existing = await UserModel.findOne({ email: newEmail });
        if (existing) {
            res.status(409).json({ message: 'An account already exists with this email.', success: false });
            return;
        }
        const redis = getRedis();
        if (!redis) {
            res.status(503).json({ message: 'Email change temporarily unavailable.', success: false });
            return;
        }
        const codeCurrent = generateEmailOtpDigits();
        const codeNew = generateEmailOtpDigits();
        const key = redisKeys.auth.emailChange(String(user._id));
        await redis.setEx(key, EMAIL_CHANGE_TTL_SEC, JSON.stringify({ codeCurrent, codeNew, newEmail }));
        await sendAuthEmail({
            to: currentEmail,
            subject: 'Verify your email change – Syntax Stories',
            html: `<p>Your verification code for changing your email: <strong>${codeCurrent}</strong>. Valid for 10 minutes.</p>`,
        });
        await sendAuthEmail({
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
export async function verifyEmailChange(req, res) {
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
        const redis = getRedis();
        if (!redis) {
            res.status(503).json({ message: 'Email change temporarily unavailable.', success: false });
            return;
        }
        const key = redisKeys.auth.emailChange(String(user._id));
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
        const doc = await UserModel.findById(user._id).select('email');
        if (!doc) {
            res.status(404).json({ message: 'User not found', success: false });
            return;
        }
        const newEmail = payload.newEmail.toLowerCase().trim();
        await UserModel.findByIdAndUpdate(user._id, {
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
        void writeAuditLog(req, AuditAction.EMAIL_CHANGE, { actorId: String(user._id), metadata: { newEmail } });
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
export async function cancelEmailChange(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ message: 'Unauthorized', success: false });
            return;
        }
        const redis = getRedis();
        if (redis) {
            const key = redisKeys.auth.emailChange(String(user._id));
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
//# sourceMappingURL=emailChange.controller.js.map