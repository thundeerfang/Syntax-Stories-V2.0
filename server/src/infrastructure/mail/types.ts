/**
 * Structured mail errors for ops and user-facing messages.
 */
export type MailErrorKind = 'configuration' | 'transient' | 'provider';

export class MailSendError extends Error {
  override readonly name = 'MailSendError';

  constructor(
    message: string,
    public readonly kind: MailErrorKind,
    public readonly cause?: unknown
  ) {
    super(message);
  }
}

export function isMailSendError(err: unknown): err is MailSendError {
  return err instanceof MailSendError;
}
