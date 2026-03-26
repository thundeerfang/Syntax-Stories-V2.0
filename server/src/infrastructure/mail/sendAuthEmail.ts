import { env } from '../../config/env';
import { getSmtpTransporter, sendViaSmtp } from './provider/smtpProvider';
import { sendViaResend } from './provider/resendProvider';
import { isMailSendError, MailSendError } from './types';

export { MailSendError, isMailSendError } from './types';
export type { MailErrorKind } from './types';

export function isAuthEmailConfigured(): boolean {
  return !!(getSmtpTransporter() || env.RESEND_API_KEY?.trim());
}

/**
 * Try SMTP first when configured; on failure (or if SMTP missing) try Resend when RESEND_API_KEY is set.
 */
export async function sendAuthEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const smtp = getSmtpTransporter();
  let smtpErr: unknown;
  if (smtp) {
    try {
      await sendViaSmtp(opts);
      return;
    } catch (e) {
      smtpErr = e;
    }
  }
  if (env.RESEND_API_KEY?.trim()) {
    try {
      await sendViaResend(opts.to, opts.subject, opts.html);
      return;
    } catch (e) {
      if (smtpErr) {
        console.error('[sendAuthEmail] SMTP failed, Resend failed:', smtpErr, e);
      }
      throw e;
    }
  }
  if (smtpErr) throw smtpErr;
  throw new MailSendError('No email provider configured', 'configuration');
}

export function getEmailSendErrorMessage(err: unknown): string {
  if (isMailSendError(err)) {
    if (err.kind === 'configuration') {
      const code = (err.cause as { code?: string } | undefined)?.code;
      if (code === 'EAUTH') {
        return 'Email not configured. For Gmail, use an App Password (see https://support.google.com/mail/?p=InvalidSecondFactor) and set EMAIL_APP_PASSWORD in .env.';
      }
    }
    return err.message;
  }
  const code = (err as { code?: string })?.code;
  if (code === 'EAUTH') {
    return 'Email not configured. For Gmail, use an App Password (see https://support.google.com/mail/?p=InvalidSecondFactor) and set EMAIL_APP_PASSWORD in .env.';
  }
  return (err as Error)?.message ?? 'Failed to send email.';
}
