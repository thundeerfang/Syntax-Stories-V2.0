import { env } from '../../../config/env.js';
import { MailSendError } from '../types.js';
function mailFrom() {
    return (env.RESEND_FROM?.trim() ||
        env.EMAIL_FROM?.trim() ||
        env.EMAIL_USER?.trim() ||
        'onboarding@resend.dev');
}
export async function sendViaResend(to, subject, html, replyTo) {
    const key = env.RESEND_API_KEY?.trim();
    if (!key) {
        throw new MailSendError('Resend not configured (RESEND_API_KEY)', 'configuration');
    }
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: mailFrom(),
            to: [to],
            subject,
            html,
            ...(replyTo?.trim() ? { reply_to: replyTo.trim() } : {}),
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        const status = res.status;
        const kind = status >= 500 || status === 429 ? 'transient' : 'provider';
        throw new MailSendError(`Resend HTTP ${status}: ${body || res.statusText}`, kind);
    }
}
//# sourceMappingURL=resendProvider.js.map