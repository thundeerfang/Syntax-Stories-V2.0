import nodemailer from 'nodemailer';
import { env } from '../../../config/env';
import { MailSendError } from '../types';

let transporter: nodemailer.Transporter | null = null;

export function getSmtpTransporter(): nodemailer.Transporter | null {
  const user = env.EMAIL_USER?.trim();
  const pass = (env.EMAIL_APP_PASSWORD ?? process.env.EMAIL_PASS)?.trim();
  if (!user || !pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendViaSmtp(opts: { to: string; subject: string; html: string }): Promise<void> {
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
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    const kind: 'configuration' | 'transient' =
      code === 'EAUTH' || code === 'EENVELOPE' ? 'configuration' : 'transient';
    throw new MailSendError((e as Error)?.message ?? 'SMTP send failed', kind, e);
  }
}
