/**
 * Typed HTTP errors for consistent responses via `errorHandler`.
 */
export declare class AppHttpError extends Error {
    readonly statusCode: number;
    readonly code?: string | undefined;
    readonly details?: unknown | undefined;
    name: string;
    constructor(message: string, statusCode: number, code?: string | undefined, details?: unknown | undefined);
}
export declare class ValidationHttpError extends AppHttpError {
    readonly name = "ValidationHttpError";
    constructor(message: string, details?: unknown);
}
export declare class AuthHttpError extends AppHttpError {
    name: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class RateLimitHttpError extends AppHttpError {
    readonly retryAfterSec?: number | undefined;
    name: string;
    constructor(message: string, retryAfterSec?: number | undefined, code?: string, details?: unknown);
}
export declare function isAppHttpError(err: unknown): err is AppHttpError;
//# sourceMappingURL=httpErrors.d.ts.map