/**
 * Structured mail errors for ops and user-facing messages.
 */
export type MailErrorKind = 'configuration' | 'transient' | 'provider';
export declare class MailSendError extends Error {
    readonly kind: MailErrorKind;
    readonly cause?: unknown | undefined;
    readonly name = "MailSendError";
    constructor(message: string, kind: MailErrorKind, cause?: unknown | undefined);
}
export declare function isMailSendError(err: unknown): err is MailSendError;
//# sourceMappingURL=types.d.ts.map