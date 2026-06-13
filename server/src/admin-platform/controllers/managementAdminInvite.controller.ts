import type { Request, Response } from 'express';
import { sendAdminError, sendAdminOk } from '../rbac/adminResponse.js';
import { sendAdminInviteOtp, verifyAdminInviteOtp } from '../auth/adminInviteOtp.service.js';
import { writeAuditLog } from '../../shared/audit/auditLog.js';
import { AuditAction } from '../../shared/audit/events.js';
import { incrementIamMetric } from '../iam/iamMetrics.service.js';
import type { StaffManagementRequest } from '../rbac/middleware/staffManagementContext.js';

export async function postAdminInviteSendOtp(req: Request, res: Response): Promise<void> {
  const email = String((req.body as { email?: string }).email ?? '')
    .trim()
    .toLowerCase();
  if (!email || !email.includes('@')) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Valid email is required');
    return;
  }

  const result = await sendAdminInviteOtp(email);
  if (!result.ok) {
    sendAdminError(
      res,
      result.status,
      result.status === 409 ? 'CONFLICT' : 'VALIDATION_ERROR',
      result.message
    );
    return;
  }

  const actor = req as StaffManagementRequest;
  void incrementIamMetric('invite_otp_sent');
  void writeAuditLog(req, AuditAction.ADMIN_INVITE_OTP_SENT, {
    actorId: actor.user?._id,
    metadata: { email, otpVersion: result.otpVersion },
  });

  sendAdminOk(res, {
    otpVersion: result.otpVersion,
    expiresInSeconds: result.expiresInSeconds,
  });
}

export async function postAdminInviteVerifyOtp(req: Request, res: Response): Promise<void> {
  const body = req.body as { email?: string; code?: string; otpVersion?: number };
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  const code = String(body.code ?? '').trim();

  if (!email || !code) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Email and verification code are required');
    return;
  }

  const result = await verifyAdminInviteOtp(email, code, body.otpVersion);
  if (!result.ok) {
    sendAdminError(res, result.status, 'VALIDATION_ERROR', result.message);
    return;
  }

  const actor = req as StaffManagementRequest;
  void writeAuditLog(req, AuditAction.ADMIN_INVITE_OTP_VERIFIED, {
    actorId: actor.user?._id,
    metadata: { email },
  });

  sendAdminOk(res, {
    emailVerificationToken: result.emailVerificationToken,
    expiresInSeconds: result.expiresInSeconds,
  });
}
