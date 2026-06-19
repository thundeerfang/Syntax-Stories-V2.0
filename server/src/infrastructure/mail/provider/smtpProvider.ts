import { lookup } from "node:dns";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { env } from "../../../config/env.js";
import { MailSendError } from "../types.js";
let transporter: nodemailer.Transporter | null = null;
type DnsLookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string,
  family: number,
) => void;
type SmtpLookupOptions = {
  family?: 0 | 4 | 6;
  hints?: number;
  all?: false;
  verbatim?: boolean;
  order?: "ipv4first" | "ipv6first" | "verbatim";
};
type SmtpLookup = (
  hostname: string,
  options: SmtpLookupOptions | DnsLookupCallback,
  callback?: DnsLookupCallback,
) => void;
const lookupIpv4: SmtpLookup = (hostname, options, callback) => {
  const cb = typeof options === "function" ? options : callback;
  if (!cb) return;
  const lookupOptions: SmtpLookupOptions =
    typeof options === "function" ? { family: 4 } : { ...options, family: 4 };
  lookup(hostname, lookupOptions, cb);
};
type SmtpTransportOptions = SMTPTransport.Options & {
  family?: 4 | 6;
  lookup?: SmtpLookup;
};
export function buildSmtpTransportOptions(): SmtpTransportOptions {
  const user = env.EMAIL_USER?.trim();
  const pass = (env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS)?.trim();
  return {
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_PORT === 465,
    family: 4,
    lookup: lookupIpv4,
    auth: user && pass ? { user, pass } : undefined,
  };
}
export function getSmtpTransporter(): nodemailer.Transporter | null {
  const user = env.EMAIL_USER?.trim();
  const pass = (env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS)?.trim();
  if (!user || !pass) return null;
  transporter ??= nodemailer.createTransport(buildSmtpTransportOptions());
  return transporter;
}
export async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const smtp = getSmtpTransporter();
  if (!smtp) {
    throw new MailSendError(
      "SMTP not configured (EMAIL_USER / EMAIL_APP_PASSWORD)",
      "configuration",
    );
  }
  const from = env.EMAIL_FROM?.trim() || env.EMAIL_USER;
  if (!from) {
    throw new MailSendError(
      "SMTP from address missing (EMAIL_FROM or EMAIL_USER)",
      "configuration",
    );
  }
  try {
    await smtp.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo?.trim() ? { replyTo: opts.replyTo.trim() } : {}),
    });
  } catch (e) {
    const code = (
      e as {
        code?: string;
      }
    )?.code;
    const kind: "configuration" | "transient" =
      code === "EAUTH" || code === "EENVELOPE" ? "configuration" : "transient";
    throw new MailSendError(
      (e as Error)?.message ?? "SMTP send failed",
      kind,
      e,
    );
  }
}
