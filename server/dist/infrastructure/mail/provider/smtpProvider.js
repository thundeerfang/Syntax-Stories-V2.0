import nodemailer from 'nodemailer';
import { env } from '../../../config/env.js';
import { MailSendError } from '../types.js';
let transporter = null;
export function getSmtpTransporter() {
    const user = env.EMAIL_USER?.trim();
    const pass = (env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS)?.trim();
    if (!user || !pass)
        return null;
    transporter ??= nodemailer.createTransport({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_PORT === 465,
        auth: { user, pass },
    });
    return transporter;
}
export async function sendViaSmtp(opts) {
    const smtp = getSmtpTransporter();
    if (!smtp) {
        throw new MailSendError('SMTP not configured (EMAIL_USER / EMAIL_APP_PASSWORD)', 'configuration');
    }
    const from = env.EMAIL_FROM?.trim() || env.EMAIL_USER;
    if (!from) {
        throw new MailSendError('SMTP from address missing (EMAIL_FROM or EMAIL_USER)', 'configuration');
    }
    try {
        await smtp.sendMail({
            from,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
            ...(opts.replyTo?.trim() ? { replyTo: opts.replyTo.trim() } : {}),
        });
    }
    catch (e) {
        const code = e?.code;
        const kind = code === 'EAUTH' || code === 'EENVELOPE' ? 'configuration' : 'transient';
        throw new MailSendError(e?.message ?? 'SMTP send failed', kind, e);
    }
}
//# sourceMappingURL=smtpProvider.js.map