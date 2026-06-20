import { lookup } from "node:dns";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { env } from "../../../config/env.js";
import { MailSendError } from "../types.js";
let primaryTransporter: nodemailer.Transporter | null = null;
let gmailFallbackTransporter: nodemailer.Transporter | null = null;
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
type SmtpProviderConfig = {
  host?: string;
  port: number;
  user?: string;
  pass?: string;
};
function buildSmtpTransportOptionsFromConfig(
  config: SmtpProviderConfig,
): SmtpTransportOptions {
  const user = config.user?.trim();
  const pass = config.pass?.trim();
  return {
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    family: 4,
    lookup: lookupIpv4,
    auth: user && pass ? { user, pass } : undefined,
  };
}
export function buildSmtpTransportOptions(): SmtpTransportOptions {
  return buildSmtpTransportOptionsFromConfig({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    user: env.EMAIL_USER,
    pass: env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS,
  });
}
function buildGmailFallbackTransportOptions(): SmtpTransportOptions {
  return buildSmtpTransportOptionsFromConfig({
    host: env.GMAIL_EMAIL_HOST?.trim() || "smtp.gmail.com",
    port: env.GMAIL_EMAIL_PORT,
    user: env.GMAIL_EMAIL_USER,
    pass: env.GMAIL_APP_PASSWORD,
  });
}
export function getSmtpTransporter(): nodemailer.Transporter | null {
  const user = env.EMAIL_USER?.trim();
  const pass = (env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS)?.trim();
  if (!user || !pass) return null;
  primaryTransporter ??= nodemailer.createTransport(buildSmtpTransportOptions());
  return primaryTransporter;
}
function getGmailFallbackTransporter(): nodemailer.Transporter | null {
  const user = env.GMAIL_EMAIL_USER?.trim();
  const pass = env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) return null;
  gmailFallbackTransporter ??= nodemailer.createTransport(
    buildGmailFallbackTransportOptions(),
  );
  return gmailFallbackTransporter;
}
export function hasSmtpTransporter(): boolean {
  return Boolean(getSmtpTransporter() || getGmailFallbackTransporter());
}
export async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const smtp = getSmtpTransporter();
  const gmailFallback = getGmailFallbackTransporter();
  if (!smtp && !gmailFallback) {
    throw new MailSendError(
      "SMTP not configured (EMAIL_USER / EMAIL_APP_PASSWORD or GMAIL_EMAIL_USER / GMAIL_APP_PASSWORD)",
      "configuration",
    );
  }
  const from = env.EMAIL_FROM?.trim() || env.EMAIL_USER || env.GMAIL_EMAIL_USER;
  if (!from) {
    throw new MailSendError(
      "SMTP from address missing (EMAIL_FROM or EMAIL_USER)",
      "configuration",
    );
  }
  const message = {
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    ...(opts.replyTo?.trim() ? { replyTo: opts.replyTo.trim() } : {}),
  };
  try {
    await smtp?.sendMail(message);
    if (smtp) return;
  } catch (e) {
    if (gmailFallback) {
      try {
        await gmailFallback.sendMail(message);
        return;
      } catch (fallbackErr) {
        throw buildMailSendError(fallbackErr);
      }
    }
    throw buildMailSendError(e);
  }
  if (gmailFallback) {
    try {
      await gmailFallback.sendMail(message);
      return;
    } catch (fallbackErr) {
      throw buildMailSendError(fallbackErr);
    }
  }
}
function buildMailSendError(e: unknown): MailSendError {
    const code = (
      e as {
        code?: string;
      }
    )?.code;
    const kind: "configuration" | "transient" =
      code === "EAUTH" || code === "EENVELOPE" ? "configuration" : "transient";
  return new MailSendError(
    (e as Error)?.message ?? "SMTP send failed",
    kind,
    e,
  );
}
