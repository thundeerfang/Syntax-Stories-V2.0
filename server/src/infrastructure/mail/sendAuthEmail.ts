import { env } from "../../config/env.js";
import { sendViaBrevo } from "./provider/brevoProvider.js";
import { isMailSendError, MailSendError } from "./types.js";
export { MailSendError, isMailSendError } from "./types.js";
export type { MailErrorKind } from "./types.js";
export function isAuthEmailConfigured(): boolean {
  return !!env.BREVO_API_KEY?.trim();
}
export async function sendAuthEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  if (!env.BREVO_API_KEY?.trim()) {
    throw new MailSendError(
      "Brevo API not configured (BREVO_API_KEY)",
      "configuration",
    );
  }
  await sendViaBrevo(opts.to, opts.subject, opts.html, opts.replyTo);
}
export function getEmailSendErrorMessage(err: unknown): string {
  if (isMailSendError(err)) {
    return err.message;
  }
  return (err as Error)?.message ?? "Failed to send email.";
}
