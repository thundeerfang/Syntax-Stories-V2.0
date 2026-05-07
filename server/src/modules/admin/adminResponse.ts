import type { Response } from 'express';

export type AdminErrorCode =
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'INTERNAL';

export function sendAdminError(
  res: Response,
  status: number,
  code: AdminErrorCode,
  message: string
): void {
  res.status(status).json({
    success: false,
    error: { code, message },
  });
}

export function sendAdminOk<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}
