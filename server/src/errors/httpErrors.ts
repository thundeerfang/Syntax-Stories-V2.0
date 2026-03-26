/**
 * Typed HTTP errors for consistent responses via `errorHandler`.
 */
export class AppHttpError extends Error {
  override name = 'AppHttpError';

  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export class ValidationHttpError extends AppHttpError {
  override readonly name = 'ValidationHttpError';

  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthHttpError extends AppHttpError {
  override name = 'AuthHttpError';

  constructor(message: string, statusCode = 401, code = 'AUTH_ERROR') {
    super(message, statusCode, code);
  }
}

export class RateLimitHttpError extends AppHttpError {
  override name = 'RateLimitHttpError';

  constructor(
    message: string,
    public readonly retryAfterSec?: number
  ) {
    super(message, 429, 'RATE_LIMIT');
  }
}

export function isAppHttpError(err: unknown): err is AppHttpError {
  return err instanceof AppHttpError;
}
