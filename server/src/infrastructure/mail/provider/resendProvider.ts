import { env } from '../../../config/env';
import { MailSendError } from '../types';

function mailFrom(): string {
  return (
    env.RESEND_FROM?.trim() ||
    env.EMAIL_FROM?.trim() ||
    env.EMAIL_USER?.trim() ||
    'onboarding@resend.dev'
  );
}

export async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
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
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const status = res.status;
    const kind: 'transient' | 'provider' = status >= 500 || status === 429 ? 'transient' : 'provider';
    throw new MailSendError(`Resend HTTP ${status}: ${body || res.statusText}`, kind);
  }
}
