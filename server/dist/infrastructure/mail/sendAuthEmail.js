import { env } from '../../config/env.js';
import { getSmtpTransporter, sendViaSmtp } from './provider/smtpProvider.js';
import { sendViaResend } from './provider/resendProvider.js';
import { isMailSendError, MailSendError } from './types.js';
export { MailSendError, isMailSendError } from './types.js';
export function isAuthEmailConfigured() {
    return !!(getSmtpTransporter() || env.RESEND_API_KEY?.trim());
}
/**
 * Try SMTP first when configured; on failure (or if SMTP missing) try Resend when RESEND_API_KEY is set.
 */
export async function sendAuthEmail(opts) {
    const smtp = getSmtpTransporter();
    let smtpErr;
    if (smtp) {
        try {
            await sendViaSmtp(opts);
            return;
        }
        catch (e) {
            smtpErr = e;
        }
    }
    if (env.RESEND_API_KEY?.trim()) {
        try {
            await sendViaResend(opts.to, opts.subject, opts.html, opts.replyTo);
            return;
        }
        catch (e) {
            if (smtpErr) {
                console.error('[sendAuthEmail] SMTP failed, Resend failed:', smtpErr, e);
            }
            throw e;
        }
    }
    if (smtpErr)
        throw smtpErr;
    throw new MailSendError('No email provider configured', 'configuration');
}
export function getEmailSendErrorMessage(err) {
    if (isMailSendError(err)) {
        if (err.kind === 'configuration') {
            const code = err.cause?.code;
            if (code === 'EAUTH') {
                return 'Email not configured. For Gmail, use an App Password (see https://support.google.com/mail/?p=InvalidSecondFactor) and set EMAIL_APP_PASSWORD in .env.';
            }
        }
        return err.message;
    }
    const code = err?.code;
    if (code === 'EAUTH') {
        return 'Email not configured. For Gmail, use an App Password (see https://support.google.com/mail/?p=InvalidSecondFactor) and set EMAIL_APP_PASSWORD in .env.';
    }
    return err?.message ?? 'Failed to send email.';
}
//# sourceMappingURL=sendAuthEmail.js.map