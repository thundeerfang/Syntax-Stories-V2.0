import type { Response } from 'express';
import { AppHttpError, RateLimitHttpError } from './httpErrors.js';

/** Same JSON/headers as `errorHandler` for `AppHttpError` — use when a controller catches and must respond inline (Express 4 async). */
export function sendAppHttpError(res: Response, err: AppHttpError): void {
  if (err instanceof RateLimitHttpError && err.retryAfterSec != null) {
    res.setHeader('Retry-After', String(err.retryAfterSec));
  }
  const body: Record<string, unknown> = {
    success: false,
    message: err.message,
  };
  if (err.code) body.code = err.code;
  if (err.details !== undefined) body.details = err.details;
  res.status(err.statusCode).json(body);
}
