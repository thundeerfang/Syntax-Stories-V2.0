import type { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import { UserModel } from '../../models/User.js';
import type { AuthUser } from '../../middlewares/auth/index.js';
import { completeAdminStepUp } from '../iam/adminSessionIdle.service.js';
import { writeAuditLog } from '../../shared/audit/auditLog.js';
import { AuditAction } from '../../shared/audit/events.js';
import { incrementIamMetric } from '../iam/iamMetrics.service.js';

/**
 * POST /auth/2fa/step-up — verify TOTP for sensitive admin actions (session must be active).
 */
export async function verifyStepUp(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    const { token } = req.body as { token?: string };
    if (!user?._id || !user.sessionId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    if (!token?.trim()) {
      res.status(400).json({ success: false, message: 'token is required' });
      return;
    }

    const dbUser = await UserModel.findById(user._id).select('+twoFactorSecret twoFactorEnabled');
    if (!dbUser?.twoFactorEnabled || !dbUser.twoFactorSecret) {
      res.status(400).json({
        success: false,
        message: 'Two-factor authentication is not configured on this account.',
      });
      return;
    }

    const isValid = speakeasy.totp.verify({
      secret: dbUser.twoFactorSecret,
      encoding: 'base32',
      token: String(token).replace(/\D/g, '').slice(0, 6),
      window: 1,
    });

    if (!isValid) {
      res.status(401).json({ success: false, message: 'Invalid 2FA code' });
      return;
    }

    await completeAdminStepUp(user.sessionId, user._id);
    void incrementIamMetric('step_up_verified');
    void writeAuditLog(req, AuditAction.ADMIN_STEP_UP_VERIFIED, {
      actorId: user._id,
      metadata: { sessionId: user.sessionId },
    });

    res.status(200).json({
      success: true,
      message: 'Step-up verification successful',
      expiresInSeconds: 15 * 60,
    });
  } catch (err) {
    console.error('[verifyStepUp]', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
