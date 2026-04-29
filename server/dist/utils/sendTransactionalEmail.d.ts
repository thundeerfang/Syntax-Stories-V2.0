/** True when using REST email (API key + header) instead of SMTP. */
export declare function usesEmailApi(): boolean;
export declare function isEmailTransportConfigured(): boolean;
/**
 * Sends one transactional message. Prefers HTTP API when EMAIL_API_URL + EMAIL_API_KEY are set; otherwise SMTP.
 */
export declare function sendTransactionalEmail(opts: {
    to: string;
    subject: string;
    html: string;
    from?: string;
}): Promise<void>;
export declare function getEmailSendErrorMessage(err: unknown): string;
//# sourceMappingURL=sendTransactionalEmail.d.ts.map