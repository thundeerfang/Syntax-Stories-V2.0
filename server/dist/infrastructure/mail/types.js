export class MailSendError extends Error {
    kind;
    cause;
    name = 'MailSendError';
    constructor(message, kind, cause) {
        super(message);
        this.kind = kind;
        this.cause = cause;
    }
}
export function isMailSendError(err) {
    return err instanceof MailSendError;
}
//# sourceMappingURL=types.js.map