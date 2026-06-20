import { env } from "../../config/env.js";
import { hasSmtpTransporter, sendViaSmtp } from "./provider/smtpProvider.js";
import { sendViaBrevo } from "./provider/brevoProvider.js";
import { sendViaResend } from "./provider/resendProvider.js";
import { isMailSendError, MailSendError } from "./types.js";
export { MailSendError, isMailSendError } from "./types.js";
export type { MailErrorKind } from "./types.js";
export function isAuthEmailConfigured(): boolean {
  return !!(
    env.BREVO_API_KEY?.trim() ||
    hasSmtpTransporter() ||
    env.RESEND_API_KEY?.trim()
  );
}
export async function sendAuthEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  let brevoErr: unknown;
  if (env.BREVO_API_KEY?.trim()) {
    try {
      await sendViaBrevo(opts.to, opts.subject, opts.html, opts.replyTo);
      return;
    } catch (e) {
      brevoErr = e;
    }
  }
  const smtp = hasSmtpTransporter();
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
      await sendViaResend(opts.to, opts.subject, opts.html, opts.replyTo);
      return;
    } catch (e) {
      if (smtpErr) {
        console.error(
          "[sendAuthEmail] SMTP failed, Resend failed:",
          smtpErr,
          e,
        );
      }
      if (brevoErr) {
        console.error("[sendAuthEmail] Brevo failed, Resend failed:", brevoErr, e);
      }
      throw e;
    }
  }
  if (brevoErr) throw brevoErr;
  if (smtpErr) throw smtpErr;
  throw new MailSendError("No email provider configured", "configuration");
}
export function getEmailSendErrorMessage(err: unknown): string {
  if (isMailSendError(err)) {
    if (err.kind === "configuration") {
      const code = (
        err.cause as
          | {
              code?: string;
            }
          | undefined
      )?.code;
      if (code === "EAUTH") {
        return "Email not configured. For Gmail, use an App Password (see https://support.google.com/mail/?p=InvalidSecondFactor) and set EMAIL_APP_PASSWORD in .env.";
      }
    }
    return err.message;
  }
  const code = (
    err as {
      code?: string;
    }
  )?.code;
  if (code === "EAUTH") {
    return "Email not configured. For Gmail, use an App Password (see https://support.google.com/mail/?p=InvalidSecondFactor) and set EMAIL_APP_PASSWORD in .env.";
  }
  return (err as Error)?.message ?? "Failed to send email.";
}
