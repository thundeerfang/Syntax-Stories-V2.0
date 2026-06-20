import { env } from "../../../config/env.js";
import { MailSendError } from "../types.js";

function mailFrom(): { email: string; name?: string } {
  const raw =
    env.BREVO_FROM?.trim() ||
    env.EMAIL_FROM?.trim() ||
    env.EMAIL_USER?.trim() ||
    "";
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    const name = match[1]?.trim().replace(/^"|"$/g, "");
    const email = match[2]?.trim();
    return { email: email || raw, ...(name ? { name } : {}) };
  }
  return { email: raw };
}

export async function sendViaBrevo(
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
): Promise<void> {
  const key = env.BREVO_API_KEY?.trim();
  if (!key) {
    throw new MailSendError(
      "Brevo API not configured (BREVO_API_KEY)",
      "configuration",
    );
  }
  const sender = mailFrom();
  if (!sender.email) {
    throw new MailSendError(
      "Brevo sender missing (BREVO_FROM or EMAIL_FROM)",
      "configuration",
    );
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(replyTo?.trim() ? { replyTo: { email: replyTo.trim() } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const status = res.status;
    const kind: "transient" | "provider" =
      status >= 500 || status === 429 ? "transient" : "provider";
    throw new MailSendError(
      `Brevo HTTP ${status}: ${body || res.statusText}`,
      kind,
    );
  }
}
