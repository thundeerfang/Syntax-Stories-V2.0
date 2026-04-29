/**
 * Typed HTTP errors for consistent responses via `errorHandler`.
 */
export class AppHttpError extends Error {
    statusCode;
    code;
    details;
    name = 'AppHttpError';
    constructor(message, statusCode, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}
export class ValidationHttpError extends AppHttpError {
    name = 'ValidationHttpError';
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}
export class AuthHttpError extends AppHttpError {
    name = 'AuthHttpError';
    constructor(message, statusCode = 401, code = 'AUTH_ERROR') {
        super(message, statusCode, code);
    }
}
export class RateLimitHttpError extends AppHttpError {
    retryAfterSec;
    name = 'RateLimitHttpError';
    constructor(message, retryAfterSec, code = 'RATE_LIMIT', details) {
        super(message, 429, code, details);
        this.retryAfterSec = retryAfterSec;
    }
}
export function isAppHttpError(err) {
    return err instanceof AppHttpError;
}
//# sourceMappingURL=httpErrors.js.map