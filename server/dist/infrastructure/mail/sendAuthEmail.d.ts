export { MailSendError, isMailSendError } from './types.js';
export type { MailErrorKind } from './types.js';
export declare function isAuthEmailConfigured(): boolean;
/**
 * Try SMTP first when configured; on failure (or if SMTP missing) try Resend when RESEND_API_KEY is set.
 */
export declare function sendAuthEmail(opts: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
}): Promise<void>;
export declare function getEmailSendErrorMessage(err: unknown): string;
//# sourceMappingURL=sendAuthEmail.d.ts.map