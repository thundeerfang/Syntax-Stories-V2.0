import type { Response } from "express";
export type AdminErrorCode =
  | "PERMISSION_DENIED"
  | "ZONE_DENIED"
  | "STEP_UP_REQUIRED"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "INTERNAL"
  | "FEATURE_DISABLED"
  | "SESSION_TIER_REQUIRED"
  | "RISK_BLOCKED"
  | "REBAC_DENIED";
export function sendAdminError(
  res: Response,
  status: number,
  code: AdminErrorCode,
  message: string,
  details?: Record<string, unknown>,
): void {
  res.status(status).json({
    success: false,
    error: { code, message, ...details },
  });
}
export function sendAdminOk<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}
